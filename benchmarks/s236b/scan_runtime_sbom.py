#!/usr/bin/env python3
"""Emit a bodyless installed-file SBOM for the allowlisted benchmark runtime."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import re
import sys
from pathlib import Path, PurePosixPath


EXPECTED_COMPONENTS = {
    "anyio": ("4.14.2", "MIT"),
    "certifi": ("2026.7.22", "MPL-2.0"),
    "h11": ("0.16.0", "MIT"),
    "httpcore": ("1.0.9", "BSD-3-Clause"),
    "httpx": ("0.28.1", "BSD-3-Clause"),
    "idna": ("3.18", "BSD-3-Clause"),
    "networkx": ("3.6.1", "BSD-3-Clause"),
    "numpy": ("2.3.5", "BSD-3-Clause-and-bundled-notices"),
    "opencv-python-headless": (
        "4.13.0.92",
        "MIT-wrapper_AND_Apache-2.0_AND_bundled-notices",
    ),
    "opt-einsum": ("3.3.0", "MIT"),
    "paddlepaddle": ("3.3.1", "Apache-2.0"),
    "pillow": ("12.3.0", "MIT-CMU"),
    "protobuf": ("7.35.1", "BSD-3-Clause"),
    "pyyaml": ("6.0.2", "MIT"),
    "safetensors": ("0.8.0", "Apache-2.0"),
    "setuptools": ("83.0.0", "MIT-and-vendored-notices"),
    "typing-extensions": ("4.16.0", "PSF-2.0"),
}

KNOWN_WHEEL_HASHES = {
    "opencv-python-headless": {
        "filename": "opencv_python_headless-4.13.0.92-cp37-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl",
        "sha256": "0525a3d2c0b46c611e2130b5fdebc94cf404845d8fa64d2f3a3b679572a5bd22",
    },
    "paddlepaddle": {
        "filename": "paddlepaddle-3.3.1-cp312-cp312-manylinux1_x86_64.whl",
        "sha256": "9016fc497213e1101261684321fbb31ef5960019ef39cb07ded27bc70e2a9858",
    },
}


def canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def digest(value: object) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def normalize_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def distribution_row(distribution) -> dict[str, object]:
    name = normalize_name(distribution.metadata["Name"])
    file_rows = []
    license_rows = []
    for relative in distribution.files or ():
        pure = PurePosixPath(str(relative))
        if pure.is_absolute() or ".." in pure.parts:
            continue
        path = Path(distribution.locate_file(relative))
        if not path.is_file():
            continue
        file_sha256 = hashlib.sha256(path.read_bytes()).hexdigest()
        file_rows.append(
            {
                "relative_locator_sha256": hashlib.sha256(
                    pure.as_posix().encode("utf-8")
                ).hexdigest(),
                "file_sha256": file_sha256,
                "byte_count": path.stat().st_size,
            }
        )
        lowered = pure.as_posix().lower()
        if "license" in lowered or "copying" in lowered:
            license_rows.append(
                {
                    "relative_locator_sha256": hashlib.sha256(
                        pure.as_posix().encode("utf-8")
                    ).hexdigest(),
                    "license_text_sha256": file_sha256,
                    "byte_count": path.stat().st_size,
                }
            )
    file_rows.sort(key=lambda row: row["relative_locator_sha256"])
    license_rows.sort(key=lambda row: row["relative_locator_sha256"])
    wheel = KNOWN_WHEEL_HASHES.get(name)
    expected_version, license_id = EXPECTED_COMPONENTS[name]
    return {
        "component_id": name,
        "component_version": distribution.version,
        "version_matches_lock": distribution.version == expected_version,
        "license_id": license_id,
        "license_file_count": len(license_rows),
        "license_files_digest": digest(license_rows),
        "installed_file_count": len(file_rows),
        "installed_byte_count": sum(row["byte_count"] for row in file_rows),
        "installed_file_inventory_sha256": digest(file_rows),
        "wheel_filename_or_null": wheel["filename"] if wheel else None,
        "wheel_sha256_or_null": wheel["sha256"] if wheel else None,
        "wheel_pin_provenance_status": (
            "declared_candidate_pin_not_local_artifact_or_install_receipt"
            if wheel
            else "not_available"
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--candidate-lock", type=Path, required=True)
    parser.add_argument("--expected-scanner-sha256", required=True)
    parser.add_argument("--expected-python-version", required=True)
    args = parser.parse_args()
    scanner_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    if scanner_sha256 != args.expected_scanner_sha256:
        raise SystemExit("S236B_SBOM_SCANNER_DIGEST_MISMATCH")
    candidate_lock = json.loads(args.candidate_lock.read_text())
    if (
        sys.version.split()[0] != args.expected_python_version
        or candidate_lock["candidateConfiguration"]["paddleocr"][
            "python_version"
        ]
        != args.expected_python_version
    ):
        raise SystemExit("S236B_SBOM_SCANNER_PYTHON_VERSION_MISMATCH")

    distributions = {
        normalize_name(distribution.metadata["Name"]): distribution
        for distribution in importlib.metadata.distributions()
        if distribution.metadata.get("Name")
    }
    actual_names = set(distributions)
    expected_names = set(EXPECTED_COMPONENTS)
    unexpected = sorted(actual_names - expected_names)
    missing = sorted(expected_names - actual_names)
    if missing:
        print(
            canonical_bytes(
                {
                    "schema_version": "s236b.sbom-scan-summary.v3",
                    "status": "failed_closed",
                    "component_count": len(actual_names & expected_names),
                    "unexpected_component_count": len(unexpected),
                    "missing_component_count": len(missing),
                }
            ).decode("utf-8")
        )
        return 1
    rows = [
        distribution_row(distributions[name]) for name in sorted(expected_names)
    ]
    version_mismatch_count = sum(
        not row["version_matches_lock"] for row in rows
    )
    license_file_missing_count = sum(
        row["license_file_count"] == 0 for row in rows
    )
    wheel_hash_missing_count = sum(
        row["wheel_sha256_or_null"] is None for row in rows
    )
    component_set_preimage = {
        "schema_version": "s236b.runtime-component-set.v1",
        "component_count": len(rows),
        "ordered_component_rows_digest": digest(rows),
    }
    component_set_sha256 = digest(component_set_preimage)
    if (
        component_set_preimage != candidate_lock["componentSetPreimage"]
        or component_set_sha256
        != candidate_lock["orderedCandidateRows"][0]["component_set_sha256"]
        or any(
            row["component_set_sha256"] != component_set_sha256
            for row in candidate_lock["orderedCandidateRows"]
        )
    ):
        raise SystemExit("S236B_SBOM_CANDIDATE_COMPONENT_SET_MISMATCH")
    result = {
        "schema_version": "s236b.installed-runtime-sbom.v3",
        "status": "python_distribution_inventory_complete_review_incomplete",
        "decision": "not_a_verified_license_and_SBOM_receipt",
        "scanner_sha256": args.expected_scanner_sha256,
        "python_version": args.expected_python_version,
        "inventory_scope": "isolated_python_distributions_only",
        "native_os_and_driver_inventory_status": "not_inventoried",
        "component_count": len(rows),
        "ordered_component_rows": rows,
        "ordered_component_rows_digest": digest(rows),
        "component_set_preimage": component_set_preimage,
        "component_set_sha256": component_set_sha256,
        "ordered_candidate_rows": candidate_lock["orderedCandidateRows"],
        "ordered_candidate_rows_digest": digest(
            candidate_lock["orderedCandidateRows"]
        ),
        "unexpected_component_count": len(unexpected),
        "missing_component_count": len(missing),
        "version_mismatch_count": version_mismatch_count,
        "license_file_missing_count": license_file_missing_count,
        "wheel_hash_missing_count": wheel_hash_missing_count,
        "wheel_hash_coverage_count": len(rows) - wheel_hash_missing_count,
        "wheel_hashes_are_declared_candidate_pins_not_verified_install_receipts":
            True,
        "stock_paddleocr_present": "paddleocr" in actual_names,
        "paddlex_present": "paddlex" in actual_names,
        "aistudio_sdk_present": "aistudio-sdk" in actual_names,
        "vulnerability_database_snapshot_sha256_or_null": None,
        "vulnerability_scan_status": "not_run_offline_database_snapshot_unavailable",
        "license_ids_are_observed_declarations_not_human_decisions": True,
        "license_policy_evaluation_status": "not_run_named_human_review_required",
        "forbidden_license_count_or_null": None,
        "unresolved_component_count": len(rows),
    }
    result["sbom_sha256"] = digest(result)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(canonical_bytes(result))
    print(
        canonical_bytes(
            {
                "schema_version": "s236b.sbom-scan-summary.v3",
                "sbom_sha256": result["sbom_sha256"],
                "component_count": result["component_count"],
                "unexpected_component_count": result[
                    "unexpected_component_count"
                ],
                "missing_component_count": result["missing_component_count"],
                "aistudio_sdk_present": result["aistudio_sdk_present"],
                "wheel_hash_missing_count": result[
                    "wheel_hash_missing_count"
                ],
            }
        ).decode("utf-8")
    )
    return 0 if not unexpected and not missing and not version_mismatch_count else 1


if __name__ == "__main__":
    raise SystemExit(main())
