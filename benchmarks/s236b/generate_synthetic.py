#!/usr/bin/env python3
"""Create synthetic OCR fixtures with a separate expectation-authority root."""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import importlib.metadata
import json
import secrets
import sys
import unicodedata
import uuid
from pathlib import Path, PurePosixPath


RISK_FIELDS = (
    "negation",
    "numbers",
    "signs",
    "percentages",
    "choice_order",
    "law_dates",
    "tables",
    "formulas",
)


def canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def digest(value: object) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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
            raise SystemExit("S236B_GENERATOR_DEPENDENCY_MISSING_FROM_SBOM")
        if importlib.metadata.version(name) != row["component_version"]:
            raise SystemExit("S236B_GENERATOR_DEPENDENCY_VERSION_MISMATCH")
        if distribution_inventory_sha256(name) != (
            row["installed_file_inventory_sha256"]
        ):
            raise SystemExit("S236B_GENERATOR_DEPENDENCY_BYTES_MISMATCH")


def verify_imported_module_origin(
    module: object,
    distribution_name: str,
) -> None:
    module_path_value = getattr(module, "__file__", None)
    if not module_path_value:
        raise SystemExit("S236B_GENERATOR_MODULE_ORIGIN_MISSING")
    module_path = Path(module_path_value).resolve()
    distribution = importlib.metadata.distribution(distribution_name)
    distribution_files = {
        Path(distribution.locate_file(relative)).resolve()
        for relative in distribution.files or ()
        if Path(distribution.locate_file(relative)).is_file()
    }
    if module_path not in distribution_files:
        raise SystemExit("S236B_GENERATOR_MODULE_ORIGIN_NOT_IN_INVENTORY")


def refuse_git_worktree(target: Path) -> Path:
    repository = Path(__file__).resolve().parents[2]
    resolved = target.resolve()
    try:
        resolved.relative_to(repository)
    except ValueError:
        return resolved
    raise SystemExit("S236B_REFUSED_GIT_WORKTREE_OUTPUT")


def require_distinct_roots(runner_root: Path, authority_root: Path) -> None:
    if runner_root == authority_root:
        raise SystemExit("S236B_RUNNER_AND_AUTHORITY_ROOTS_MUST_DIFFER")
    for parent, child in (
        (runner_root, authority_root),
        (authority_root, runner_root),
    ):
        try:
            child.relative_to(parent)
        except ValueError:
            continue
        raise SystemExit("S236B_RUNNER_AND_AUTHORITY_ROOTS_MUST_NOT_NEST")


def require_empty(target: Path, error_code: str) -> None:
    if target.exists() and any(target.iterdir()):
        raise SystemExit(error_code)


def write_owner_sentinel(
    root: Path,
    root_role: str,
    run_id: str,
    candidate_configuration_sha256: str,
    benchmark_configuration_bundle_sha256: str,
) -> str:
    root_instance_nonce = secrets.token_hex(32)
    owner = {
        "schema_version": "s236b.root-owner-sentinel.v2",
        "run_id": run_id,
        "root_role": root_role,
        "root_instance_nonce": root_instance_nonce,
        "approved_parent_sha256": hashlib.sha256(
            root.resolve().parent.as_posix().encode("utf-8")
        ).hexdigest(),
        "target_basename_sha256": hashlib.sha256(
            root.name.encode("utf-8")
        ).hexdigest(),
        "target_locator_sha256": hashlib.sha256(
            root.resolve().as_posix().encode("utf-8")
        ).hexdigest(),
        "candidate_configuration_sha256": candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            benchmark_configuration_bundle_sha256,
    }
    root.mkdir(parents=True, exist_ok=True)
    path = root / ".s236b-root-owner.json"
    path.write_bytes(canonical_bytes(owner))
    return file_sha256(path)


def hangul_token(length: int) -> str:
    return "".join(chr(0xAC00 + secrets.randbelow(11172)) for _ in range(length))


def digits(length: int) -> str:
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def generated_values(risk_field: str) -> list[str]:
    if risk_field == "negation":
        return [hangul_token(3) + "이 아님"]
    if risk_field == "numbers":
        return [digits(3) + "." + digits(2)]
    if risk_field == "signs":
        return [secrets.choice(("+", "−")) + digits(2) + "." + digits(1)]
    if risk_field == "percentages":
        return [digits(2) + "." + digits(1) + "%"]
    if risk_field == "choice_order":
        labels = list("12345")
        secrets.SystemRandom().shuffle(labels)
        return [label + ")" + hangul_token(3) + digits(1) for label in labels]
    if risk_field == "law_dates":
        year = 2031 + secrets.randbelow(29)
        month = 1 + secrets.randbelow(12)
        day = 1 + secrets.randbelow(28)
        return [f"법률 {year:04d}.{month:02d}.{day:02d}"]
    if risk_field == "tables":
        return [hangul_token(2) + digits(2) for _ in range(4)]
    if risk_field == "formulas":
        superscripts = "¹²³⁴⁵⁶⁷⁸"
        subscripts = "₁₂₃₄₅₆₇₈"
        a = secrets.choice(superscripts)
        b = 1 + secrets.randbelow(8)
        c = secrets.choice(subscripts)
        return [f"(x{a}−y÷{b})+z{c}=0"]
    raise ValueError("unknown risk field")


def structural_coordinates(risk_field: str, count: int) -> list[dict[str, int]]:
    if risk_field == "tables":
        return [
            {"ordinal": index + 1, "row": index // 2, "column": index % 2}
            for index in range(count)
        ]
    return [
        {"ordinal": index + 1, "row": index, "column": 0}
        for index in range(count)
    ]


def render_fixture(
    values: list[str],
    risk_field: str,
    destination: Path,
    font_path: Path,
) -> tuple[int, int]:
    import cv2
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont

    if risk_field == "choice_order":
        width, height, font_size = 448, 300, 34
    elif risk_field == "tables":
        width, height, font_size = 448, 220, 32
    else:
        width, height, font_size = 448, 84, 34

    image = Image.new("L", (width, height), 246)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(font_path), font_size)
    ink = secrets.choice((8, 12, 18))

    if risk_field == "choice_order":
        for index, value in enumerate(values):
            draw.text((24, 18 + index * 54), value, fill=ink, font=font)
    elif risk_field == "tables":
        draw.line((8, 8, width - 8, 8), fill=ink, width=2)
        draw.line((8, height // 2, width - 8, height // 2), fill=ink, width=2)
        draw.line((8, height - 8, width - 8, height - 8), fill=ink, width=2)
        draw.line((8, 8, 8, height - 8), fill=ink, width=2)
        draw.line((width // 2, 8, width // 2, height - 8), fill=ink, width=2)
        draw.line((width - 8, 8, width - 8, height - 8), fill=ink, width=2)
        for index, value in enumerate(values):
            row, column = divmod(index, 2)
            draw.text(
                (28 + column * width // 2, 34 + row * height // 2),
                value,
                fill=ink,
                font=font,
            )
    else:
        value = values[0]
        box = draw.textbbox((0, 0), value, font=font)
        text_width = box[2] - box[0]
        text_height = box[3] - box[1]
        x = max(10, (width - text_width) // 2)
        y = max(4, (height - text_height) // 2 - box[1])
        draw.text((x, y), value, fill=ink, font=font)

    array = np.array(image, dtype=np.uint8)
    gradient = np.linspace(
        0, secrets.choice((8, 12, 16)), width, dtype=np.float32
    )
    array = np.clip(array.astype(np.float32) - gradient, 0, 255)
    noise = np.random.default_rng().normal(
        0.0, secrets.choice((1.5, 2.0, 2.5)), array.shape
    )
    array = np.clip(array + noise, 0, 255).astype(np.uint8)
    angle = secrets.choice((-1.4, -0.7, 0.0, 0.8, 1.5))
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
    rotated = cv2.warpAffine(
        array,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    if not cv2.imwrite(str(destination), rotated, [cv2.IMWRITE_PNG_COMPRESSION, 9]):
        raise RuntimeError("S236B_FIXTURE_WRITE_FAILED")
    return width, height


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runner-work-dir", type=Path, required=True)
    parser.add_argument("--authority-work-dir", type=Path, required=True)
    parser.add_argument("--font", type=Path, required=True)
    parser.add_argument("--expected-font-sha256", required=True)
    parser.add_argument("--candidate-lock", type=Path, required=True)
    parser.add_argument("--expected-candidate-lock-sha256", required=True)
    parser.add_argument("--runtime-sbom", type=Path, required=True)
    parser.add_argument("--expected-runtime-sbom-file-sha256", required=True)
    parser.add_argument("--expected-generator-sha256", required=True)
    parser.add_argument("--expected-python-version", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--candidate-configuration-sha256", required=True)
    parser.add_argument("--benchmark-configuration-bundle-sha256", required=True)
    parser.add_argument("--groups-per-risk", type=int, default=4)
    args = parser.parse_args()

    runner_root = refuse_git_worktree(args.runner_work_dir)
    authority_root = refuse_git_worktree(args.authority_work_dir)
    require_distinct_roots(runner_root, authority_root)
    require_empty(runner_root, "S236B_RUNNER_ROOT_MUST_BE_EMPTY")
    require_empty(authority_root, "S236B_AUTHORITY_ROOT_MUST_BE_EMPTY")
    if args.groups_per_risk < 2:
        raise SystemExit("S236B_NEEDS_CALIBRATION_AND_HIDDEN_GROUPS")
    if not args.run_id or len(args.run_id) > 128:
        raise SystemExit("S236B_RUN_ID_INVALID")
    if file_sha256(args.font) != args.expected_font_sha256:
        raise SystemExit("S236B_FONT_DIGEST_MISMATCH")
    if file_sha256(Path(__file__)) != args.expected_generator_sha256:
        raise SystemExit("S236B_GENERATOR_DIGEST_MISMATCH")
    if (
        not args.candidate_lock.is_file()
        or file_sha256(args.candidate_lock)
        != args.expected_candidate_lock_sha256
    ):
        raise SystemExit("S236B_GENERATOR_CANDIDATE_LOCK_DIGEST_MISMATCH")
    if (
        not args.runtime_sbom.is_file()
        or file_sha256(args.runtime_sbom)
        != args.expected_runtime_sbom_file_sha256
    ):
        raise SystemExit("S236B_GENERATOR_SBOM_DIGEST_MISMATCH")
    lock = json.loads(args.candidate_lock.read_text())
    runtime_sbom = json.loads(args.runtime_sbom.read_text())
    if (
        lock["coherenceRoots"]["candidateConfigurationSha256"]
        != args.candidate_configuration_sha256
        or digest(lock["candidateConfiguration"])
        != args.benchmark_configuration_bundle_sha256
        or runtime_sbom["ordered_candidate_rows"]
        != lock["orderedCandidateRows"]
        or runtime_sbom["component_set_preimage"]
        != lock["componentSetPreimage"]
    ):
        raise SystemExit("S236B_GENERATOR_CONFIGURATION_BINDING_MISMATCH")
    if (
        sys.version.split()[0] != args.expected_python_version
        or lock["candidateConfiguration"]["paddleocr"]["python_version"]
        != args.expected_python_version
    ):
        raise SystemExit("S236B_GENERATOR_PYTHON_VERSION_MISMATCH")
    verify_execution_dependencies(
        runtime_sbom,
        ("opencv-python-headless", "numpy", "pillow"),
    )
    import cv2
    import numpy as np
    import PIL

    if cv2.__version__ != (
        lock["candidateConfiguration"]["opencv"]["runtime_cv2_version"]
    ):
        raise SystemExit("S236B_GENERATOR_CV2_RUNTIME_VERSION_MISMATCH")
    verify_imported_module_origin(cv2, "opencv-python-headless")
    verify_imported_module_origin(np, "numpy")
    verify_imported_module_origin(PIL, "pillow")

    runner_owner_sha256 = write_owner_sentinel(
        runner_root,
        "runner",
        args.run_id,
        args.candidate_configuration_sha256,
        args.benchmark_configuration_bundle_sha256,
    )
    authority_owner_sha256 = write_owner_sentinel(
        authority_root,
        "authority",
        args.run_id,
        args.candidate_configuration_sha256,
        args.benchmark_configuration_bundle_sha256,
    )

    fixture_dir = runner_root / "fixture-bodies"
    runner_input_dir = runner_root / "runner-input"
    bodyless_dir = runner_root / "bodyless"
    expectation_dir = authority_root / "sealed-expectations"
    fixture_dir.mkdir(parents=True, exist_ok=True)
    runner_input_dir.mkdir(parents=True, exist_ok=True)
    bodyless_dir.mkdir(parents=True, exist_ok=True)
    expectation_dir.mkdir(parents=True, exist_ok=True)

    commitment_key = secrets.token_bytes(32)
    execution_rows: list[dict[str, object]] = []
    bodyless_rows: list[dict[str, object]] = []
    expected_rows: list[dict[str, object]] = []

    for risk_field in RISK_FIELDS:
        for group_index in range(args.groups_per_risk):
            group_id = str(uuid.uuid4())
            fixture_id = str(uuid.uuid4())
            split_class = (
                "ocr_benchmark_calibration"
                if group_index == 0
                else "ocr_benchmark_hidden_test"
            )
            values = generated_values(risk_field)
            coordinates = structural_coordinates(risk_field, len(values))
            relative_name = fixture_id + ".png"
            image_path = fixture_dir / relative_name
            width, height = render_fixture(
                values, risk_field, image_path, args.font
            )
            image_sha256 = file_sha256(image_path)
            execution_rows.append(
                {
                    "fixture_id": fixture_id,
                    "group_id": group_id,
                    "risk_field": risk_field,
                    "relative_fixture_locator": relative_name,
                    "image_sha256": image_sha256,
                    "width": width,
                    "height": height,
                    "field_count": len(values),
                }
            )

            for value, coordinate in zip(values, coordinates):
                field_id = str(uuid.uuid4())
                normalized_value = unicodedata.normalize("NFC", value)
                expected_hmac = hmac.new(
                    commitment_key,
                    normalized_value.encode("utf-8"),
                    hashlib.sha256,
                ).hexdigest()
                split_hmac = hmac.new(
                    commitment_key,
                    split_class.encode("ascii"),
                    hashlib.sha256,
                ).hexdigest()
                structure = {
                    "ordinal": coordinate["ordinal"],
                    "row": coordinate["row"],
                    "column": coordinate["column"],
                }
                bodyless_rows.append(
                    {
                        "field_id": field_id,
                        "fixture_id": fixture_id,
                        "group_id": group_id,
                        "risk_field": risk_field,
                        "image_sha256": image_sha256,
                        "expected_value_hmac_sha256": expected_hmac,
                        "split_class_hmac_sha256": split_hmac,
                        "width": width,
                        "height": height,
                        "structure": structure,
                    }
                )
                expected_rows.append(
                    {
                        "field_id": field_id,
                        "fixture_id": fixture_id,
                        "group_id": group_id,
                        "risk_field": risk_field,
                        "expected_value": normalized_value,
                        "split_class": split_class,
                        "structure": structure,
                    }
                )

    execution_manifest = {
        "schema_version": "s236b.ephemeral-execution-manifest.v3",
        "candidate_configuration_sha256": args.candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.benchmark_configuration_bundle_sha256,
        "ordered_rows": execution_rows,
    }
    fixture_manifest = {
        "schema_version": "s236b.bodyless-field-ground-truth-manifest.v3",
        "fixture_source_class": "author_created_nondeterministic_synthetic_only",
        "rendering_font_sha256": args.expected_font_sha256,
        "real_learner_content_count": 0,
        "copyrighted_private_content_count": 0,
        "separately_authorized_private_fixture_count": 0,
        "synthetic_fixture_count": len(execution_rows),
        "synthetic_field_count": len(bodyless_rows),
        "ordered_field_rows": bodyless_rows,
    }
    expected_manifest = {
        "schema_version": "s236b.sealed-expected-result-manifest.v3",
        "commitment_key_base64": base64.b64encode(commitment_key).decode("ascii"),
        "leak_canary": secrets.token_hex(32),
        "ordered_field_rows": expected_rows,
    }

    (runner_input_dir / "execution-manifest.raw.json").write_bytes(
        canonical_bytes(execution_manifest)
    )
    (expectation_dir / "expected-results.raw.json").write_bytes(
        canonical_bytes(expected_manifest)
    )
    (bodyless_dir / "field-ground-truth-manifest.json").write_bytes(
        canonical_bytes(fixture_manifest)
    )

    summary = {
        "schema_version": "s236b.synthetic-generation-summary.v3",
        "run_id_sha256": hashlib.sha256(
            args.run_id.encode("utf-8")
        ).hexdigest(),
        "generator_sha256": args.expected_generator_sha256,
        "candidate_lock_sha256": args.expected_candidate_lock_sha256,
        "runtime_sbom_file_sha256":
            args.expected_runtime_sbom_file_sha256,
        "python_version": args.expected_python_version,
        "executed_dependency_components": [
            "numpy",
            "opencv-python-headless",
            "pillow",
        ],
        "selected_installed_distribution_inventories_matched": True,
        "imported_module_origins_matched_distribution_inventories": True,
        "python_executable_bytes_verified": False,
        "native_dependency_closure_verified": False,
        "runner_owner_sentinel_sha256": runner_owner_sha256,
        "authority_owner_sentinel_sha256": authority_owner_sha256,
        "risk_field_count": len(RISK_FIELDS),
        "group_count": len(RISK_FIELDS) * args.groups_per_risk,
        "fixture_count": len(execution_rows),
        "field_count": len(bodyless_rows),
        "synthetic_fixture_count": len(execution_rows),
        "synthetic_field_count": len(bodyless_rows),
        "real_learner_content_count": 0,
        "copyrighted_private_content_count": 0,
        "fixture_manifest_sha256": digest(fixture_manifest),
        "expected_result_manifest_sha256": digest(expected_manifest),
        "candidate_configuration_sha256": args.candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.benchmark_configuration_bundle_sha256,
        "runner_and_authority_roots_distinct": True,
        "expectation_authority_root_supplied_to_runner": False,
        "seed_persisted": False,
    }
    (bodyless_dir / "generation-summary.json").write_bytes(canonical_bytes(summary))
    print(canonical_bytes(summary).decode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
