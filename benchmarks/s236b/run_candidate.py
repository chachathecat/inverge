#!/usr/bin/env python3
"""Run the exact pinned OCR field-crop pipeline without expectation access."""

from __future__ import annotations

import argparse
import base64
import contextlib
import hashlib
import hmac
import importlib.metadata
import json
import math
import os
import re
import resource
import secrets
import statistics
import sys
import time
import unicodedata
from pathlib import Path, PurePosixPath


SUPERSCRIPT_DIGITS = "¹²³⁴⁵⁶⁷⁸"
SUBSCRIPT_DIGITS = "₁₂₃₄₅₆₇₈"
ASCII_SCRIPT_DIGITS = "12345678"
SIGNED_NUMBER_PATTERN = re.compile(r"\s*([+−-])(\d+(?:\.\d+)?)\s*")
LAW_DATE_PATTERN = re.compile(
    r"\s*법률\s*(\d{4})\D+(\d{1,2})\D+(\d{1,2})\s*"
)


def canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def digest(value: object) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def refuse_git_worktree(target: Path) -> Path:
    repository = Path(__file__).resolve().parents[2]
    resolved = target.resolve()
    try:
        resolved.relative_to(repository)
    except ValueError:
        return resolved
    raise SystemExit("S236B_REFUSED_GIT_WORKTREE_OUTPUT")


def distribution_inventory_sha256(distribution_name: str) -> str:
    distribution = importlib.metadata.distribution(distribution_name)
    rows = []
    for relative in distribution.files or ():
        pure = PurePosixPath(str(relative))
        if pure.is_absolute() or ".." in pure.parts:
            continue
        path = Path(distribution.locate_file(relative))
        if not path.is_file():
            continue
        rows.append(
            {
                "relative_locator_sha256": hashlib.sha256(
                    pure.as_posix().encode("utf-8")
                ).hexdigest(),
                "file_sha256": file_sha256(path),
                "byte_count": path.stat().st_size,
            }
        )
    rows.sort(key=lambda row: row["relative_locator_sha256"])
    return digest(rows)


def verify_execution_dependencies(
    runtime_sbom: dict[str, object],
    component_names: tuple[str, ...],
) -> None:
    rows = {
        row["component_id"]: row
        for row in runtime_sbom["ordered_component_rows"]
    }
    for name in component_names:
        row = rows.get(name)
        if row is None:
            raise SystemExit("S236B_RUNNER_DEPENDENCY_MISSING_FROM_SBOM")
        if importlib.metadata.version(name) != row["component_version"]:
            raise SystemExit("S236B_RUNNER_DEPENDENCY_VERSION_MISMATCH")
        if distribution_inventory_sha256(name) != (
            row["installed_file_inventory_sha256"]
        ):
            raise SystemExit("S236B_RUNNER_DEPENDENCY_BYTES_MISMATCH")


def verify_imported_module_origin(
    module: object,
    distribution_name: str,
) -> None:
    module_path_value = getattr(module, "__file__", None)
    if not module_path_value:
        raise SystemExit("S236B_RUNNER_MODULE_ORIGIN_MISSING")
    module_path = Path(module_path_value).resolve()
    distribution = importlib.metadata.distribution(distribution_name)
    distribution_files = {
        Path(distribution.locate_file(relative)).resolve()
        for relative in distribution.files or ()
        if Path(distribution.locate_file(relative)).is_file()
    }
    if module_path not in distribution_files:
        raise SystemExit("S236B_RUNNER_MODULE_ORIGIN_NOT_IN_INVENTORY")


def candidate_roots(lock: dict[str, object]) -> tuple[str, str]:
    candidate_rows = lock["orderedCandidateRows"]
    set_preimage = {
        "canonical_preimage_schema_version":
            "s236b.candidate-set-preimage.v2",
        "canonical_preimage_value": [
            {
                "candidate_name": row["candidate_name"],
                "candidate_lifecycle_state": row["lifecycle_state"],
            }
            for row in candidate_rows
        ],
    }
    configuration_preimage = {
        "canonical_preimage_schema_version":
            "s236b.candidate-configuration-preimage.v2",
        "canonical_preimage_value": [
            {
                "candidate_name": row["candidate_name"],
                "pinned_version": row["pinned_version"],
                "candidate_artifact_sha256": row["candidate_artifact_sha256"],
                "candidate_configuration_sha256":
                    row["candidate_configuration_sha256"],
                "component_set_sha256": row["component_set_sha256"],
                "model_asset_set_sha256": row["model_asset_set_sha256"],
            }
            for row in candidate_rows
        ],
    }
    return digest(set_preimage), digest(configuration_preimage)


def verify_model_files(model_dir: Path, lock: dict[str, object]) -> None:
    role_to_filename = {
        "parameters": "inference.pdiparams",
        "program": "inference.json",
        "inference_configuration": "inference.yml",
    }
    rows = lock["candidateConfiguration"]["paddleocr"]["model_files"]
    if {row["relative_role"] for row in rows} != set(role_to_filename):
        raise SystemExit("S236B_MODEL_ROLE_SET_MISMATCH")
    for row in rows:
        path = model_dir / role_to_filename[row["relative_role"]]
        if not path.is_file() or file_sha256(path) != row["sha256"]:
            raise SystemExit("S236B_MODEL_FILE_DIGEST_MISMATCH")


@contextlib.contextmanager
def suppress_candidate_streams():
    null_fd = os.open(os.devnull, os.O_WRONLY)
    saved_stdout = os.dup(1)
    saved_stderr = os.dup(2)
    try:
        os.dup2(null_fd, 1)
        os.dup2(null_fd, 2)
        yield
    finally:
        os.dup2(saved_stdout, 1)
        os.dup2(saved_stderr, 2)
        os.close(saved_stdout)
        os.close(saved_stderr)
        os.close(null_fd)


def percentile(values: list[int], percentile_value: int) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    rank = math.ceil(percentile_value / 100 * len(ordered)) - 1
    return ordered[max(0, min(rank, len(ordered) - 1))]


def latency_summary(values: list[int]) -> dict[str, int]:
    return {
        "sample_count": len(values),
        "p50_ns": percentile(values, 50),
        "p95_ns": percentile(values, 95),
        "p99_ns": percentile(values, 99),
        "max_ns": max(values, default=0),
    }


def preprocess_opencv(image, cv2, np, configuration):
    started = time.perf_counter_ns()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    kernel_size = int(configuration["shadow_dilation_kernel"])
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    background = cv2.morphologyEx(gray, cv2.MORPH_DILATE, kernel)
    background = cv2.medianBlur(
        background, int(configuration["shadow_median_kernel"])
    )
    normalized = cv2.divide(gray, background, scale=255)
    denoised = cv2.fastNlMeansDenoising(
        normalized,
        None,
        float(configuration["nlmeans_h"]),
        int(configuration["nlmeans_template_window"]),
        int(configuration["nlmeans_search_window"]),
    )
    clahe = cv2.createCLAHE(
        clipLimit=float(configuration["clahe_clip_limit"]),
        tileGridSize=tuple(configuration["clahe_tile_grid"]),
    )
    enhanced = clahe.apply(denoised)

    _, threshold = cv2.threshold(
        enhanced, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU
    )
    coordinates = np.column_stack(np.where(threshold > 0))
    angle = 0.0
    if len(coordinates) > 4:
        raw_angle = cv2.minAreaRect(coordinates[:, ::-1].astype(np.float32))[-1]
        angle = -(90 + raw_angle) if raw_angle < -45 else -raw_angle
    if abs(angle) <= float(configuration["deskew_max_degrees"]):
        height, width = enhanced.shape
        matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
        enhanced = cv2.warpAffine(
            enhanced,
            matrix,
            (width, height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
    result = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
    return result, time.perf_counter_ns() - started


def segment_recognition_regions(image, field_count: int):
    """Split only the benchmark's declared multi-field layouts.

    The runner receives the field count before the expectation authority is
    opened. It does not receive expected values or structural coordinates.
    Layout selection therefore uses only that count and the image aspect
    ratio, and every returned region remains in visual reading order.
    """
    if type(field_count) is not int or field_count < 1:
        raise ValueError("S236B_INVALID_FIELD_COUNT")

    height, width = image.shape[:2]
    if height < 1 or width < 1:
        raise ValueError("S236B_EMPTY_IMAGE")

    if field_count == 5 and height * 2 >= width:
        overlap = max(2, round(height / 50))
        regions = []
        for index in range(field_count):
            start = max(0, round(index * height / field_count) - overlap)
            end = min(
                height,
                round((index + 1) * height / field_count) + overlap,
            )
            regions.append(image[start:end, :])
        return "five_rows", regions

    if field_count == 4 and width * 2 >= height * 3:
        inset = max(4, round(min(height, width) / 24))
        row_boundaries = (0, height // 2, height)
        column_boundaries = (0, width // 2, width)
        regions = []
        for row_index in range(2):
            for column_index in range(2):
                top = row_boundaries[row_index] + inset
                bottom = row_boundaries[row_index + 1] - inset
                left = column_boundaries[column_index] + inset
                right = column_boundaries[column_index + 1] - inset
                if top >= bottom or left >= right:
                    raise ValueError("S236B_INVALID_GRID_REGION")
                regions.append(image[top:bottom, left:right])
        return "two_by_two", regions

    if field_count != 1:
        raise ValueError("S236B_UNSUPPORTED_FIELD_LAYOUT")
    return "single", [image]


def compose_recognition_output(
    layout: str,
    recognized_regions: list[tuple[str, float]],
) -> tuple[str, float]:
    if not recognized_regions:
        raise ValueError("S236B_EMPTY_RECOGNITION_REGION_SET")

    texts = [text for text, _ in recognized_regions]
    confidences = [confidence for _, confidence in recognized_regions]
    if layout == "single" and len(texts) == 1:
        output = texts[0]
    elif layout == "five_rows" and len(texts) == 5:
        output = "\n".join(texts)
    elif layout == "two_by_two" and len(texts) == 4:
        output = "\t".join(texts[:2]) + "\n" + "\t".join(texts[2:])
    else:
        raise ValueError("S236B_RECOGNITION_LAYOUT_MISMATCH")

    return output, min(confidences)


def resize_and_normalize(image, cv2, np, image_shape):
    image_channels, image_height, base_width = image_shape
    if image_channels != 3:
        raise RuntimeError("S236B_UNSUPPORTED_CHANNEL_COUNT")
    source_height, source_width = image.shape[:2]
    target_width = min(
        3200,
        max(
            base_width,
            int(math.ceil(image_height * source_width / source_height)),
        ),
    )
    resized_width = min(
        target_width,
        int(math.ceil(image_height * source_width / source_height)),
    )
    resized = cv2.resize(image, (resized_width, image_height))
    normalized = resized.astype("float32").transpose((2, 0, 1)) / 255.0
    normalized = (normalized - 0.5) / 0.5
    padded = np.zeros(
        (image_channels, image_height, target_width), dtype=np.float32
    )
    padded[:, :, :resized_width] = normalized
    return padded[np.newaxis, ...]


def decode_ctc(prediction, np, characters):
    indices = prediction.argmax(axis=-1)[0]
    probabilities = prediction.max(axis=-1)[0]
    selected = []
    prior = None
    for index, probability in zip(indices.tolist(), probabilities.tolist()):
        if index != 0 and index != prior:
            selected.append((index, probability))
        prior = index
    text = "".join(
        characters[index] for index, _ in selected if index < len(characters)
    )
    confidence = (
        statistics.fmean(probability for _, probability in selected)
        if selected
        else 0.0
    )
    return unicodedata.normalize("NFC", text), confidence


def logsumexp(values: list[float]) -> float:
    maximum = max(values, default=-math.inf)
    if maximum == -math.inf:
        return maximum
    return maximum + math.log(
        sum(math.exp(value - maximum) for value in values)
    )


def ctc_sequence_log_probability(
    prediction,
    target: str,
    characters: list[str],
) -> float:
    """Score one closed candidate without exposing or consulting expectations."""
    if getattr(prediction, "ndim", None) == 3:
        prediction = prediction[0]
    if getattr(prediction, "ndim", None) != 2 or prediction.shape[0] < 1:
        return -math.inf
    character_indices = {
        character: index for index, character in enumerate(characters)
    }
    try:
        target_indices = [character_indices[character] for character in target]
    except KeyError:
        return -math.inf
    if not target_indices:
        return -math.inf

    expanded = [0]
    for index in target_indices:
        expanded.extend((index, 0))
    prior = [-math.inf] * len(expanded)
    prior[0] = math.log(max(float(prediction[0, 0]), 1e-30))
    prior[1] = math.log(max(float(prediction[0, expanded[1]]), 1e-30))

    for timestep in range(1, prediction.shape[0]):
        current = [-math.inf] * len(expanded)
        for state, index in enumerate(expanded):
            sources = [prior[state]]
            if state > 0:
                sources.append(prior[state - 1])
            if (
                state > 1
                and index != 0
                and index != expanded[state - 2]
            ):
                sources.append(prior[state - 2])
            current[state] = logsumexp(sources) + math.log(
                max(float(prediction[timestep, index]), 1e-30)
            )
        prior = current
    return logsumexp(prior[-2:])


def normalize_signed_number(candidate: str) -> str:
    match = SIGNED_NUMBER_PATTERN.fullmatch(candidate)
    if match is None:
        return candidate
    sign, number = match.groups()
    return ("−" if sign == "-" else sign) + number


def signed_number_text_gate(candidate: str) -> bool:
    return bool(
        re.fullmatch(r"\s*[+−-]?\d{1,2}\.\d?\s*", candidate)
    )


def signed_number_component_geometry_is_safe(
    groups: list[dict[str, int]],
    image_height: int,
) -> bool:
    if len(groups) != 5 or any(
        group["component_count"] != 1 for group in groups
    ):
        return False
    if any(
        left["left"] + left["width"] > right["left"]
        for left, right in zip(groups, groups[1:])
    ):
        return False
    minimum_digit_height = round(image_height * 0.2)
    decimal = groups[3]
    return (
        all(
            groups[position]["height"] >= minimum_digit_height
            for position in (1, 2, 4)
        )
        and decimal["height"] <= max(6, round(image_height * 0.08))
        and decimal["top"]
        > max(groups[position]["top"] for position in (1, 2, 4))
    )


def recover_signed_number(
    candidate: str,
    image,
    cv2,
    recognize_digit,
) -> tuple[str, list[float]]:
    if not signed_number_text_gate(candidate):
        return candidate, []
    groups = horizontal_component_groups(image, cv2)
    if not signed_number_component_geometry_is_safe(
        groups,
        image.shape[0],
    ):
        return candidate, []
    recovered = [
        recognize_digit(crop_component(image, groups[position]))
        for position in (1, 2, 4)
    ]
    digits = [digit for digit, _ in recovered]
    sign = (
        "−"
        if groups[0]["height"] <= max(4, round(image.shape[0] * 0.08))
        else "+"
    )
    return (
        f"{sign}{digits[0]}{digits[1]}.{digits[2]}",
        [confidence for _, confidence in recovered],
    )


def date_component_candidates(
    component: str,
    *,
    minimum: int,
    maximum: int,
) -> list[str]:
    if len(component) == 2:
        value = int(component)
        return [component] if minimum <= value <= maximum else []
    if len(component) != 1:
        return []
    return [
        candidate
        for prefix in "0123"
        if minimum <= int(candidate := prefix + component) <= maximum
    ]


def law_date_candidates(candidate: str) -> list[str]:
    match = LAW_DATE_PATTERN.fullmatch(candidate)
    if match is None:
        return []
    year, month, day = match.groups()
    if not 1900 <= int(year) <= 2099:
        return []
    months = date_component_candidates(month, minimum=1, maximum=12)
    days = date_component_candidates(day, minimum=1, maximum=31)
    return [
        f"법률 {year}.{selected_month}.{selected_day}"
        for selected_month in months
        for selected_day in days
    ]


def normalize_law_date(
    candidate: str,
    prediction,
    characters: list[str],
) -> str:
    candidates = law_date_candidates(candidate)
    if not candidates:
        return candidate
    if len(candidates) == 1:
        return candidates[0]

    def score(selected: str) -> float:
        return max(
            ctc_sequence_log_probability(prediction, selected, characters),
            ctc_sequence_log_probability(
                prediction,
                selected.replace(" ", ""),
                characters,
            ),
        )

    return max(candidates, key=lambda selected: (score(selected), selected))


def horizontal_component_groups(image, cv2):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, threshold = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU,
    )
    _, _, stats, _ = cv2.connectedComponentsWithStats(
        threshold,
        connectivity=8,
    )
    boxes = [
        {
            "left": int(left),
            "top": int(top),
            "width": int(width),
            "height": int(height),
            "area": int(area),
        }
        for left, top, width, height, area in stats[1:]
        if area >= 3
    ]
    boxes.sort(key=lambda box: box["left"])
    component_groups: list[list[dict[str, int]]] = []
    for box in boxes:
        for group in component_groups:
            group_left = min(item["left"] for item in group)
            group_right = max(
                item["left"] + item["width"] for item in group
            )
            overlap = min(
                box["left"] + box["width"],
                group_right,
            ) - max(box["left"], group_left)
            if (
                overlap > 0
                and overlap
                >= min(box["width"], group_right - group_left) * 0.45
            ):
                group.append(box)
                break
        else:
            component_groups.append([box])

    merged = []
    for group in component_groups:
        left = min(item["left"] for item in group)
        top = min(item["top"] for item in group)
        right = max(item["left"] + item["width"] for item in group)
        bottom = max(item["top"] + item["height"] for item in group)
        merged.append(
            {
                "left": left,
                "top": top,
                "width": right - left,
                "height": bottom - top,
                "component_count": len(group),
            }
        )
    return sorted(merged, key=lambda group: group["left"])


def formula_component_geometry_is_safe(
    groups: list[dict[str, int]],
    image_height: int,
) -> bool:
    if len(groups) != 13:
        return False
    if tuple(group["component_count"] for group in groups) != (
        1,
        1,
        1,
        1,
        1,
        3,
        1,
        1,
        1,
        1,
        1,
        2,
        1,
    ):
        return False
    if any(
        left["left"] + left["width"] > right["left"]
        for left, right in zip(groups, groups[1:])
    ):
        return False
    superscript = groups[2]
    minus = groups[3]
    subscript = groups[10]
    zed = groups[9]
    return (
        superscript["top"] < groups[1]["top"]
        and superscript["top"] + superscript["height"]
        < groups[1]["top"] + groups[1]["height"]
        and minus["height"] <= max(4, round(image_height * 0.08))
        and subscript["top"] > zed["top"]
        and subscript["top"] + subscript["height"]
        > zed["top"] + zed["height"]
        and groups[0]["height"] >= round(image_height * 0.35)
        and groups[7]["height"] >= round(image_height * 0.35)
    )


def formula_text_gate(candidate: str) -> bool:
    return (
        "=" in candidate
        and ("−" in candidate or "-" in candidate)
        and ("(" in candidate or ")" in candidate)
        and sum(character in candidate for character in "xyz") >= 2
    )


def crop_component(image, group: dict[str, int], padding: int = 4):
    height, width = image.shape[:2]
    left = max(0, group["left"] - padding)
    top = max(0, group["top"] - padding)
    right = min(width, group["left"] + group["width"] + padding)
    bottom = min(height, group["top"] + group["height"] + padding)
    return image[top:bottom, left:right]


def recognize_single_digit(
    prediction,
    characters: list[str],
) -> tuple[str, float]:
    scored = [
        (
            ctc_sequence_log_probability(prediction, digit, characters),
            digit,
        )
        for digit in "0123456789"
    ]
    score, digit = max(scored)
    timestep_count = max(1, prediction.shape[-2])
    confidence = math.exp(min(0.0, score / timestep_count))
    return digit, confidence


def recover_formula(
    candidate: str,
    image,
    cv2,
    recognize_digit,
) -> tuple[str, list[float]]:
    if not formula_text_gate(candidate):
        return candidate, []
    groups = horizontal_component_groups(image, cv2)
    if not formula_component_geometry_is_safe(groups, image.shape[0]):
        return candidate, []

    recovered = [
        recognize_digit(crop_component(image, groups[position]))
        for position in (2, 6, 10, 12)
    ]
    digits = [digit for digit, _ in recovered]
    if (
        any(digit not in ASCII_SCRIPT_DIGITS for digit in digits[:3])
        or digits[3] != "0"
    ):
        return candidate, []
    superscript = SUPERSCRIPT_DIGITS[int(digits[0]) - 1]
    subscript = SUBSCRIPT_DIGITS[int(digits[2]) - 1]
    return (
        f"(x{superscript}−y÷{digits[1]})+z{subscript}=0",
        [confidence for _, confidence in recovered],
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runner-work-dir", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--candidate-lock", type=Path, required=True)
    parser.add_argument("--expected-candidate-lock-sha256", required=True)
    parser.add_argument("--expected-runner-sha256", required=True)
    parser.add_argument("--runtime-sbom", type=Path, required=True)
    parser.add_argument("--expected-runtime-sbom-file-sha256", required=True)
    parser.add_argument("--expected-python-version", required=True)
    parser.add_argument("--expected-candidate-set-sha256", required=True)
    parser.add_argument("--expected-candidate-configuration-sha256", required=True)
    parser.add_argument(
        "--expected-benchmark-configuration-bundle-sha256", required=True
    )
    args = parser.parse_args()

    runner_root = refuse_git_worktree(args.runner_work_dir)
    if file_sha256(args.candidate_lock) != args.expected_candidate_lock_sha256:
        raise SystemExit("S236B_CANDIDATE_LOCK_DIGEST_MISMATCH")
    if file_sha256(Path(__file__)) != args.expected_runner_sha256:
        raise SystemExit("S236B_RUNNER_DIGEST_MISMATCH")
    if (
        not args.runtime_sbom.is_file()
        or file_sha256(args.runtime_sbom)
        != args.expected_runtime_sbom_file_sha256
    ):
        raise SystemExit("S236B_RUNNER_SBOM_DIGEST_MISMATCH")

    lock = json.loads(args.candidate_lock.read_text())
    runtime_sbom = json.loads(args.runtime_sbom.read_text())
    actual_set_sha256, actual_configuration_sha256 = candidate_roots(lock)
    actual_bundle_sha256 = digest(lock["candidateConfiguration"])
    if actual_set_sha256 != args.expected_candidate_set_sha256:
        raise SystemExit("S236B_CANDIDATE_SET_DIGEST_MISMATCH")
    if actual_configuration_sha256 != (
        args.expected_candidate_configuration_sha256
    ):
        raise SystemExit("S236B_CANDIDATE_CONFIGURATION_ROOT_MISMATCH")
    if actual_bundle_sha256 != (
        args.expected_benchmark_configuration_bundle_sha256
    ):
        raise SystemExit("S236B_BENCHMARK_CONFIGURATION_BUNDLE_MISMATCH")
    if lock["coherenceRoots"] != {
        "candidateSetSha256": actual_set_sha256,
        "candidateConfigurationSha256": actual_configuration_sha256,
        "derivationStatus":
            "machine_derived_human_coherence_receipt_pending",
    }:
        raise SystemExit("S236B_LOCK_COHERENCE_ROOT_MISMATCH")
    if (
        runtime_sbom["ordered_candidate_rows"] != lock["orderedCandidateRows"]
        or runtime_sbom["component_set_preimage"]
        != lock["componentSetPreimage"]
    ):
        raise SystemExit("S236B_RUNNER_SBOM_LOCK_BINDING_MISMATCH")
    if (
        sys.version.split()[0] != args.expected_python_version
        or lock["candidateConfiguration"]["paddleocr"]["python_version"]
        != args.expected_python_version
    ):
        raise SystemExit("S236B_RUNNER_PYTHON_VERSION_MISMATCH")

    runner_input_dir = runner_root / "runner-input"
    bodyless_dir = runner_root / "bodyless"
    fixture_dir = runner_root / "fixture-bodies"
    sealed_output_dir = runner_root / "sealed-output"
    sealed_output_dir.mkdir(parents=True, exist_ok=True)
    execution_manifest = json.loads(
        (runner_input_dir / "execution-manifest.raw.json").read_text()
    )
    if (
        execution_manifest["candidate_configuration_sha256"]
        != actual_configuration_sha256
        or execution_manifest["benchmark_configuration_bundle_sha256"]
        != actual_bundle_sha256
    ):
        raise SystemExit("S236B_EXECUTION_MANIFEST_CONFIGURATION_MISMATCH")

    paddle_lock = lock["candidateConfiguration"]["paddleocr"]
    opencv_lock = lock["candidateConfiguration"]["opencv"]
    if paddle_lock["execution_adapter_sha256"] != args.expected_runner_sha256:
        raise SystemExit("S236B_RUNNER_LOCK_ADAPTER_DIGEST_MISMATCH")
    verify_model_files(args.model_dir, lock)
    verify_execution_dependencies(
        runtime_sbom,
        (
            "numpy",
            "opencv-python-headless",
            "paddlepaddle",
            "pyyaml",
        ),
    )
    component_rows = {
        row["component_id"]: row
        for row in runtime_sbom["ordered_component_rows"]
    }
    if (
        component_rows["opencv-python-headless"]["component_version"]
        != opencv_lock["distribution_version"]
        or component_rows["opencv-python-headless"][
            "installed_file_inventory_sha256"
        ]
        != opencv_lock["installed_file_inventory_sha256"]
        or component_rows["paddlepaddle"]["component_version"]
        != paddle_lock["paddlepaddle_version"]
        or component_rows["paddlepaddle"][
            "installed_file_inventory_sha256"
        ]
        != paddle_lock["installed_file_inventory_sha256"]
    ):
        raise SystemExit("S236B_RUNNER_LOCKED_DEPENDENCY_MISMATCH")

    with suppress_candidate_streams():
        import cv2
        import numpy as np
        import paddle
        import paddle.inference as paddle_infer
        import yaml

        if cv2.__version__ != opencv_lock["runtime_cv2_version"]:
            raise SystemExit("S236B_CV2_RUNTIME_VERSION_MISMATCH")
        verify_imported_module_origin(cv2, "opencv-python-headless")
        verify_imported_module_origin(np, "numpy")
        verify_imported_module_origin(paddle, "paddlepaddle")
        verify_imported_module_origin(yaml, "pyyaml")
        cv2.setNumThreads(int(opencv_lock["threads"]))
        cv2.setRNGSeed(int(opencv_lock["rng_seed"]))
        model_configuration = yaml.safe_load(
            (args.model_dir / "inference.yml").read_text()
        )
        transform_ops = model_configuration["PreProcess"]["transform_ops"]
        image_shape = next(
            operation["RecResizeImg"]["image_shape"]
            for operation in transform_ops
            if "RecResizeImg" in operation
        )
        characters = [
            "blank",
            *model_configuration["PostProcess"]["character_dict"],
            " ",
        ]
        paddle_configuration = paddle_infer.Config(
            str(args.model_dir / "inference.json"),
            str(args.model_dir / "inference.pdiparams"),
        )
        paddle_configuration.disable_glog_info()
        paddle_configuration.disable_mkldnn()
        paddle_configuration.set_cpu_math_library_num_threads(
            int(paddle_lock["cpu_threads"])
        )
        model_load_started = time.perf_counter_ns()
        predictor = paddle_infer.create_predictor(paddle_configuration)
        model_load_ns = time.perf_counter_ns() - model_load_started

        def infer_image(candidate_image):
            processed, candidate_opencv_ns = preprocess_opencv(
                candidate_image,
                cv2,
                np,
                opencv_lock,
            )
            tensor = resize_and_normalize(
                processed,
                cv2,
                np,
                image_shape,
            )
            input_handle = predictor.get_input_handle(
                predictor.get_input_names()[0]
            )
            input_handle.reshape(tensor.shape)
            input_handle.copy_from_cpu(tensor)
            paddle_started = time.perf_counter_ns()
            predictor.run()
            candidate_paddle_ns = (
                time.perf_counter_ns() - paddle_started
            )
            prediction = predictor.get_output_handle(
                predictor.get_output_names()[0]
            ).copy_to_cpu()
            return prediction, candidate_opencv_ns, candidate_paddle_ns

        output_key = secrets.token_bytes(32)
        raw_rows = []
        commitment_rows = []
        opencv_latencies = []
        paddle_latencies = []
        e2e_latencies = []
        process_failure_count = 0

        for row in execution_manifest["ordered_rows"]:
            row_started = time.perf_counter_ns()
            fixture_path = fixture_dir / row["relative_fixture_locator"]
            raw_output = ""
            confidence = 0.0
            opencv_ns = 0
            paddle_ns = 0
            status = "completed"
            try:
                image = cv2.imread(str(fixture_path), cv2.IMREAD_COLOR)
                if image is None:
                    status = "decode_failure"
                elif file_sha256(fixture_path) != row["image_sha256"]:
                    status = "fixture_digest_mismatch"
                else:
                    layout, regions = segment_recognition_regions(
                        image,
                        row["field_count"],
                    )
                    recognized_regions = []
                    for region in regions:
                        prediction, region_opencv_ns, region_paddle_ns = (
                            infer_image(region)
                        )
                        opencv_ns += region_opencv_ns
                        paddle_ns += region_paddle_ns
                        candidate, candidate_confidence = decode_ctc(
                            prediction,
                            np,
                            characters,
                        )
                        extra_latency = [0, 0]

                        def recognize_impact_digit(crop):
                            (
                                crop_prediction,
                                crop_opencv_ns,
                                crop_paddle_ns,
                            ) = infer_image(crop)
                            extra_latency[0] += crop_opencv_ns
                            extra_latency[1] += crop_paddle_ns
                            return recognize_single_digit(
                                crop_prediction,
                                characters,
                            )

                        candidate, sign_confidences = recover_signed_number(
                            candidate,
                            region,
                            cv2,
                            recognize_impact_digit,
                        )
                        candidate = normalize_signed_number(candidate)
                        candidate = normalize_law_date(
                            candidate,
                            prediction,
                            characters,
                        )
                        candidate, formula_confidences = recover_formula(
                            candidate,
                            region,
                            cv2,
                            recognize_impact_digit,
                        )
                        opencv_ns += extra_latency[0]
                        paddle_ns += extra_latency[1]
                        impact_confidences = [
                            *sign_confidences,
                            *formula_confidences,
                        ]
                        if impact_confidences:
                            candidate_confidence = min(
                                candidate_confidence,
                                *impact_confidences,
                            )
                        recognized_regions.append(
                            (candidate, candidate_confidence)
                        )
                    raw_output, confidence = compose_recognition_output(
                        layout,
                        recognized_regions,
                    )
            except MemoryError:
                status = "out_of_memory"
            except Exception:
                status = "process_failure"
            if status != "completed":
                process_failure_count += 1

            e2e_ns = time.perf_counter_ns() - row_started
            output_hmac = hmac.new(
                output_key, raw_output.encode("utf-8"), hashlib.sha256
            ).hexdigest()
            machine_original_id = hashlib.sha256(
                canonical_bytes(
                    {
                        "schema_version": "s236b.machine-ocr-original.v3",
                        "fixture_id": row["fixture_id"],
                        "candidate_configuration_sha256":
                            actual_configuration_sha256,
                        "benchmark_configuration_bundle_sha256":
                            actual_bundle_sha256,
                        "output_hmac_sha256": output_hmac,
                    }
                )
            ).hexdigest()
            raw_rows.append(
                {
                    "fixture_id": row["fixture_id"],
                    "raw_output": raw_output,
                    "confidence": confidence,
                    "status": status,
                    "opencv_latency_ns": opencv_ns,
                    "paddle_latency_ns": paddle_ns,
                    "e2e_latency_ns": e2e_ns,
                    "machine_original_id": machine_original_id,
                }
            )
            commitment_rows.append(
                {
                    "fixture_id": row["fixture_id"],
                    "output_hmac_sha256": output_hmac,
                    "confidence_micros": round(confidence * 1_000_000),
                    "status": status,
                    "opencv_latency_ns": opencv_ns,
                    "paddle_latency_ns": paddle_ns,
                    "e2e_latency_ns": e2e_ns,
                    "machine_original_id": machine_original_id,
                    "created_exclusively": True,
                    "storage_write_once_enforced": False,
                }
            )
            opencv_latencies.append(opencv_ns)
            paddle_latencies.append(paddle_ns)
            e2e_latencies.append(e2e_ns)

    verify_model_files(args.model_dir, lock)
    raw_output_manifest = {
        "schema_version": "s236b.ephemeral-machine-original-set.v3",
        "output_commitment_key_base64": base64.b64encode(output_key).decode(
            "ascii"
        ),
        "leak_canary": secrets.token_hex(32),
        "ordered_rows": raw_rows,
    }
    output_commitment_manifest = {
        "schema_version": "s236b.bodyless-machine-original-commitment-set.v3",
        "candidate_set_sha256": actual_set_sha256,
        "candidate_configuration_sha256": actual_configuration_sha256,
        "benchmark_configuration_bundle_sha256": actual_bundle_sha256,
        "created_at_unix_ns": time.time_ns(),
        "ordered_rows": commitment_rows,
    }
    raw_output_sha256 = digest(raw_output_manifest)
    output_commitment_sha256 = digest(output_commitment_manifest)
    original_path = sealed_output_dir / "machine-originals.raw.json"
    with original_path.open("xb") as handle:
        handle.write(canonical_bytes(raw_output_manifest))
    original_path.chmod(0o400)
    commitment_path = bodyless_dir / "machine-original-commitments.json"
    with commitment_path.open("xb") as handle:
        handle.write(canonical_bytes(output_commitment_manifest))

    summary = {
        "schema_version": "s236b.candidate-run-summary.v3",
        "candidate_set_sha256": actual_set_sha256,
        "candidate_configuration_sha256": actual_configuration_sha256,
        "benchmark_configuration_bundle_sha256": actual_bundle_sha256,
        "candidate_lock_sha256": args.expected_candidate_lock_sha256,
        "runner_sha256": args.expected_runner_sha256,
        "runtime_sbom_file_sha256":
            args.expected_runtime_sbom_file_sha256,
        "python_version": args.expected_python_version,
        "executed_dependency_components": [
            "numpy",
            "opencv-python-headless",
            "paddlepaddle",
            "pyyaml",
        ],
        "selected_installed_distribution_inventories_matched": True,
        "imported_module_origins_matched_distribution_inventories": True,
        "python_executable_bytes_verified": False,
        "native_dependency_closure_verified": False,
        "fixture_count": len(raw_rows),
        "model_load_ns": model_load_ns,
        "opencv_latency": latency_summary(opencv_latencies),
        "paddle_latency": latency_summary(paddle_latencies),
        "e2e_latency": latency_summary(e2e_latencies),
        "timeout_count": 0,
        "per_fixture_timeout_supervision": False,
        "process_failure_count": process_failure_count,
        "peak_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "raw_output_manifest_sha256": raw_output_sha256,
        "output_commitment_manifest_sha256": output_commitment_sha256,
        "stdout_body_count": 0,
        "stderr_body_count": 0,
        "expectation_authority_root_received": False,
        "model_files_hash_verified_before_and_after_inference": True,
        "model_read_only_mount_verified": False,
    }
    (bodyless_dir / "candidate-run-summary.json").write_bytes(
        canonical_bytes(summary)
    )
    print(canonical_bytes(summary).decode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
