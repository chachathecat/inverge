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
import resource
import secrets
import statistics
import sys
import time
import unicodedata
from pathlib import Path, PurePosixPath


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
                    processed, opencv_ns = preprocess_opencv(
                        image, cv2, np, opencv_lock
                    )
                    tensor = resize_and_normalize(
                        processed, cv2, np, image_shape
                    )
                    input_handle = predictor.get_input_handle(
                        predictor.get_input_names()[0]
                    )
                    input_handle.reshape(tensor.shape)
                    input_handle.copy_from_cpu(tensor)
                    paddle_started = time.perf_counter_ns()
                    predictor.run()
                    paddle_ns = time.perf_counter_ns() - paddle_started
                    prediction = predictor.get_output_handle(
                        predictor.get_output_names()[0]
                    ).copy_to_cpu()
                    raw_output, confidence = decode_ctc(
                        prediction, np, characters
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
