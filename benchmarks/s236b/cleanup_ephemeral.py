#!/usr/bin/env python3
"""Sentinel-bound cleanup for S236B ephemeral execution roots."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path


SENTINEL_NAME = ".s236b-cleanup-sentinel.json"
OWNER_NAME = ".s236b-root-owner.json"
EVIDENCE_NAME = "cleanup-evidence.bodyless.json"
CONTROL_NAMES = {SENTINEL_NAME, OWNER_NAME, EVIDENCE_NAME}
SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")
ROLE_PREFIXES = {
    "runner": "s236b-run-",
    "authority": "s236b-authority-",
    "fault": "s236b-fault-",
}


def canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def digest(value: object) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory(target: Path) -> dict[str, object]:
    rows = []
    payload_file_count = 0
    payload_byte_count = 0
    if target.exists():
        if target.is_symlink() or not target.is_dir():
            raise SystemExit("S236B_CLEANUP_TARGET_TYPE_INVALID")
        for path in sorted(target.rglob("*")):
            if path.is_symlink():
                raise SystemExit("S236B_CLEANUP_SYMLINK_REFUSED")
            if not path.is_file():
                continue
            rows.append(
                {
                    "relative_locator_sha256": hashlib.sha256(
                        path.relative_to(target).as_posix().encode("utf-8")
                    ).hexdigest(),
                    "file_sha256": file_sha256(path),
                    "byte_count": path.stat().st_size,
                }
            )
            if path.relative_to(target).as_posix() not in CONTROL_NAMES:
                payload_file_count += 1
                payload_byte_count += path.stat().st_size
    return {
        "schema_version": "s236b.ephemeral-state.v3",
        "target_exists": target.exists(),
        "file_count": len(rows),
        "byte_count": sum(row["byte_count"] for row in rows),
        "payload_file_count": payload_file_count,
        "payload_byte_count": payload_byte_count,
        "ordered_file_rows_digest": digest(rows),
    }


def guard_target(target_input: Path, approved_parent_input: Path) -> tuple[Path, Path]:
    if target_input.is_symlink() or approved_parent_input.is_symlink():
        raise SystemExit("S236B_CLEANUP_SYMLINK_REFUSED")
    approved_parent = approved_parent_input.resolve()
    target = target_input.resolve()
    repository = Path(__file__).resolve().parents[2]
    if not approved_parent.is_dir():
        raise SystemExit("S236B_CLEANUP_APPROVED_PARENT_MISSING")
    try:
        target.relative_to(repository)
    except ValueError:
        pass
    else:
        raise SystemExit("S236B_CLEANUP_REFUSED_GIT_WORKTREE")
    if target.parent != approved_parent:
        raise SystemExit("S236B_CLEANUP_TARGET_NOT_DIRECT_APPROVED_CHILD")
    if not any(
        target.name.startswith(prefix) for prefix in ROLE_PREFIXES.values()
    ):
        raise SystemExit("S236B_CLEANUP_REFUSED_UNRECOGNIZED_TARGET")
    if not target.exists() or not target.is_dir():
        raise SystemExit("S236B_CLEANUP_TARGET_MUST_EXIST")
    return target, approved_parent


def target_role(target: Path) -> str:
    for role, prefix in ROLE_PREFIXES.items():
        if target.name.startswith(prefix):
            return role
    raise SystemExit("S236B_CLEANUP_ROLE_UNRESOLVED")


def guard_receipt(target: Path, receipt: Path) -> Path:
    if receipt.is_symlink():
        raise SystemExit("S236B_CLEANUP_RECEIPT_SYMLINK_REFUSED")
    receipt = receipt.resolve()
    if receipt.exists():
        raise SystemExit("S236B_CLEANUP_RECEIPT_ALREADY_EXISTS")
    try:
        receipt.relative_to(target)
    except ValueError:
        return receipt
    raise SystemExit("S236B_CLEANUP_RECEIPT_MUST_BE_OUTSIDE_TARGET")


def expected_observation(role: str, reason_code: str) -> dict[str, object]:
    if reason_code == "normal_completion" and role == "runner":
        return {
            "candidate_run_summary_present": True,
            "machine_original_present": True,
            "output_commitment_present": True,
        }
    if reason_code == "normal_completion" and role == "authority":
        return {"sealed_expectation_manifest_present": True}
    if reason_code == "missing_model_preload_failure" and role == "fault":
        return {
            "candidate_execution_started": False,
            "missing_model_preload_failure_observed": True,
        }
    if reason_code == "network_denial" and role == "fault":
        return {
            "socket_creation_denial_errno": "EPERM",
            "network_socket_attempt_count": 1,
        }
    if reason_code == "mid_run_timeout" and role == "fault":
        return {
            "supervisor_timeout_observed": True,
            "timed_out_process_terminated": True,
        }
    if reason_code == "interrupted_execution" and role == "fault":
        return {
            "interrupt_signal": "SIGTERM",
            "process_exit_observed": True,
        }
    raise SystemExit("S236B_CLEANUP_ROLE_REASON_PAIR_INVALID")


def validate_bound_state(
    target: Path,
    approved_parent: Path,
    role: str,
    args: argparse.Namespace,
) -> tuple[dict[str, object], str, str, str]:
    owner_path = target / OWNER_NAME
    sentinel_path = target / SENTINEL_NAME
    evidence_path = target / EVIDENCE_NAME
    if (
        not owner_path.is_file()
        or not sentinel_path.is_file()
        or not evidence_path.is_file()
    ):
        raise SystemExit("S236B_CLEANUP_BOUND_STATE_MISSING")
    owner = json.loads(owner_path.read_text())
    sentinel = json.loads(sentinel_path.read_text())
    evidence = json.loads(evidence_path.read_text())
    approved_parent_sha256 = hashlib.sha256(
        approved_parent.as_posix().encode("utf-8")
    ).hexdigest()
    target_basename_sha256 = hashlib.sha256(
        target.name.encode("utf-8")
    ).hexdigest()
    target_locator_sha256 = hashlib.sha256(
        target.as_posix().encode("utf-8")
    ).hexdigest()
    if (
        set(owner)
        != {
            "schema_version",
            "run_id",
            "root_role",
            "root_instance_nonce",
            "approved_parent_sha256",
            "target_basename_sha256",
            "target_locator_sha256",
            "candidate_configuration_sha256",
            "benchmark_configuration_bundle_sha256",
        }
        or not re.fullmatch(r"[0-9a-f]{64}", owner["root_instance_nonce"])
    ):
        raise SystemExit("S236B_CLEANUP_OWNER_SENTINEL_SHAPE_INVALID")
    owner_expected = {
        "schema_version": "s236b.root-owner-sentinel.v2",
        "run_id": args.expected_run_id,
        "root_role": role,
        "root_instance_nonce": owner["root_instance_nonce"],
        "approved_parent_sha256": approved_parent_sha256,
        "target_basename_sha256": target_basename_sha256,
        "target_locator_sha256": target_locator_sha256,
        "candidate_configuration_sha256":
            args.expected_candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.expected_benchmark_configuration_bundle_sha256,
    }
    if owner != owner_expected:
        raise SystemExit("S236B_CLEANUP_OWNER_SENTINEL_MISMATCH")
    owner_sha256 = file_sha256(owner_path)
    if owner_sha256 != args.expected_owner_sentinel_sha256:
        raise SystemExit("S236B_CLEANUP_OWNER_SENTINEL_DIGEST_MISMATCH")
    if (
        set(evidence)
        != {
            "schema_version",
            "run_id",
            "root_role",
            "root_instance_nonce",
            "approved_parent_sha256",
            "target_basename_sha256",
            "target_locator_sha256",
            "candidate_configuration_sha256",
            "benchmark_configuration_bundle_sha256",
            "fixture_manifest_sha256",
            "reason_code",
            "outcome_observed",
            "producer_implementation_sha256",
            "observation_nonce",
            "producer_observation",
            "attestation_status",
        }
        or not re.fullmatch(r"[0-9a-f]{64}", evidence["observation_nonce"])
    ):
        raise SystemExit("S236B_CLEANUP_OBSERVATION_EVIDENCE_SHAPE_INVALID")
    evidence_expected = {
        "schema_version": "s236b.cleanup-observation-evidence.v2",
        "run_id": args.expected_run_id,
        "root_role": role,
        "root_instance_nonce": owner["root_instance_nonce"],
        "approved_parent_sha256": approved_parent_sha256,
        "target_basename_sha256": target_basename_sha256,
        "target_locator_sha256": target_locator_sha256,
        "candidate_configuration_sha256":
            args.expected_candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.expected_benchmark_configuration_bundle_sha256,
        "fixture_manifest_sha256": args.expected_fixture_manifest_sha256,
        "reason_code": args.reason_code,
        "outcome_observed": True,
        "producer_implementation_sha256":
            args.expected_producer_implementation_sha256,
        "observation_nonce": evidence["observation_nonce"],
        "producer_observation": expected_observation(
            role,
            args.reason_code,
        ),
        "attestation_status":
            "local_machine_observation_not_independently_attested",
    }
    if evidence != evidence_expected:
        raise SystemExit("S236B_CLEANUP_OBSERVATION_EVIDENCE_MISMATCH")
    if file_sha256(evidence_path) != args.expected_observation_evidence_sha256:
        raise SystemExit("S236B_CLEANUP_OBSERVATION_EVIDENCE_DIGEST_MISMATCH")
    if (
        set(sentinel)
        != {
            "schema_version",
            "run_id",
            "root_role",
            "root_instance_nonce",
            "approved_parent_sha256",
            "target_basename_sha256",
            "target_locator_sha256",
            "candidate_configuration_sha256",
            "benchmark_configuration_bundle_sha256",
            "fixture_manifest_sha256",
            "reason_code",
            "owner_sentinel_sha256",
            "producer_implementation_sha256",
            "observation_evidence_relative_path",
            "observation_evidence_sha256",
        }
    ):
        raise SystemExit("S236B_CLEANUP_SENTINEL_SHAPE_INVALID")
    sentinel_expected = {
        "schema_version": "s236b.cleanup-target-sentinel.v2",
        "run_id": args.expected_run_id,
        "root_role": role,
        "root_instance_nonce": owner["root_instance_nonce"],
        "approved_parent_sha256": approved_parent_sha256,
        "target_basename_sha256": target_basename_sha256,
        "target_locator_sha256": target_locator_sha256,
        "candidate_configuration_sha256":
            args.expected_candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.expected_benchmark_configuration_bundle_sha256,
        "fixture_manifest_sha256": args.expected_fixture_manifest_sha256,
        "reason_code": args.reason_code,
        "owner_sentinel_sha256": owner_sha256,
        "producer_implementation_sha256":
            args.expected_producer_implementation_sha256,
        "observation_evidence_relative_path": EVIDENCE_NAME,
        "observation_evidence_sha256":
            args.expected_observation_evidence_sha256,
    }
    if sentinel != sentinel_expected:
        raise SystemExit("S236B_CLEANUP_SENTINEL_MISMATCH")
    return (
        sentinel,
        owner_sha256,
        file_sha256(sentinel_path),
        file_sha256(evidence_path),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--approved-parent", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--expected-cleanup-sha256", required=True)
    parser.add_argument("--expected-owner-sentinel-sha256", required=True)
    parser.add_argument(
        "--expected-producer-implementation-sha256",
        required=True,
    )
    parser.add_argument("--expected-run-id", required=True)
    parser.add_argument(
        "--expected-candidate-configuration-sha256",
        required=True,
    )
    parser.add_argument(
        "--expected-benchmark-configuration-bundle-sha256",
        required=True,
    )
    parser.add_argument("--expected-fixture-manifest-sha256", required=True)
    parser.add_argument(
        "--expected-observation-evidence-sha256",
        required=True,
    )
    parser.add_argument(
        "--reason-code",
        choices=(
            "normal_completion",
            "missing_model_preload_failure",
            "network_denial",
            "mid_run_timeout",
            "interrupted_execution",
        ),
        required=True,
    )
    args = parser.parse_args()
    for value in (
        args.expected_cleanup_sha256,
        args.expected_owner_sentinel_sha256,
        args.expected_producer_implementation_sha256,
        args.expected_candidate_configuration_sha256,
        args.expected_benchmark_configuration_bundle_sha256,
        args.expected_fixture_manifest_sha256,
        args.expected_observation_evidence_sha256,
    ):
        if not SHA256_PATTERN.fullmatch(value):
            raise SystemExit("S236B_CLEANUP_EXPECTED_DIGEST_INVALID")
    if not args.expected_run_id or len(args.expected_run_id) > 128:
        raise SystemExit("S236B_CLEANUP_RUN_ID_INVALID")
    if file_sha256(Path(__file__)) != args.expected_cleanup_sha256:
        raise SystemExit("S236B_CLEANUP_IMPLEMENTATION_DIGEST_MISMATCH")

    target, approved_parent = guard_target(
        args.target,
        args.approved_parent,
    )
    receipt_path = guard_receipt(target, args.receipt)
    role = target_role(target)
    (
        sentinel,
        owner_sentinel_sha256,
        sentinel_sha256,
        observation_evidence_sha256,
    ) = validate_bound_state(
        target,
        approved_parent,
        role,
        args,
    )

    pre_state = inventory(target)
    if (
        pre_state["file_count"] < 4
        or pre_state["byte_count"] == 0
        or pre_state["payload_file_count"] < 1
        or pre_state["payload_byte_count"] == 0
    ):
        raise SystemExit("S236B_CLEANUP_PRE_STATE_NOT_MEANINGFUL")
    pre_state_sha256 = digest(pre_state)
    expected_post_state = {
        "schema_version": "s236b.ephemeral-state.v3",
        "target_exists": False,
        "file_count": 0,
        "byte_count": 0,
        "payload_file_count": 0,
        "payload_byte_count": 0,
        "ordered_file_rows_digest": digest([]),
    }
    expected_post_state_sha256 = digest(expected_post_state)

    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.rmtree(target)
    actual_post_state = inventory(target)
    actual_post_state_sha256 = digest(actual_post_state)
    rollback_success = expected_post_state == actual_post_state

    receipt = {
        "schema_version": "s236b.bodyless-rollback-execution.v3",
        "status": "machine_cleanup_observed_human_review_pending",
        "decision": "machine_cleanup_receipt_not_a_verified_gate_receipt",
        "run_id_sha256": hashlib.sha256(
            args.expected_run_id.encode("utf-8")
        ).hexdigest(),
        "root_role": role,
        "root_instance_nonce_sha256": hashlib.sha256(
            sentinel["root_instance_nonce"].encode("utf-8")
        ).hexdigest(),
        "approved_parent_sha256": hashlib.sha256(
            approved_parent.as_posix().encode("utf-8")
        ).hexdigest(),
        "target_basename_sha256": sentinel["target_basename_sha256"],
        "target_locator_sha256": sentinel["target_locator_sha256"],
        "reason_code": args.reason_code,
        "candidate_configuration_sha256":
            args.expected_candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.expected_benchmark_configuration_bundle_sha256,
        "fixture_manifest_sha256": args.expected_fixture_manifest_sha256,
        "cleanup_implementation_sha256": args.expected_cleanup_sha256,
        "owner_sentinel_sha256": owner_sentinel_sha256,
        "sentinel_sha256": sentinel_sha256,
        "producer_implementation_sha256":
            args.expected_producer_implementation_sha256,
        "observation_evidence_sha256": observation_evidence_sha256,
        "pre_state": pre_state,
        "pre_state_sha256": pre_state_sha256,
        "expected_post_state": expected_post_state,
        "expected_post_state_sha256": expected_post_state_sha256,
        "actual_post_state": actual_post_state,
        "actual_post_state_sha256": actual_post_state_sha256,
        "rollback_target_sha256": expected_post_state_sha256,
        "rollback_state_sha256": actual_post_state_sha256,
        "rollback_receipt_context_sha256": digest(
            {
                "run_id_sha256": hashlib.sha256(
                    args.expected_run_id.encode("utf-8")
                ).hexdigest(),
                "root_role": role,
                "root_instance_nonce_sha256": hashlib.sha256(
                    sentinel["root_instance_nonce"].encode("utf-8")
                ).hexdigest(),
                "approved_parent_sha256": hashlib.sha256(
                    approved_parent.as_posix().encode("utf-8")
                ).hexdigest(),
                "target_basename_sha256":
                    sentinel["target_basename_sha256"],
                "target_locator_sha256": sentinel["target_locator_sha256"],
                "reason_code": args.reason_code,
                "candidate_configuration_sha256":
                    args.expected_candidate_configuration_sha256,
                "benchmark_configuration_bundle_sha256":
                    args.expected_benchmark_configuration_bundle_sha256,
                "fixture_manifest_sha256":
                    args.expected_fixture_manifest_sha256,
                "cleanup_implementation_sha256":
                    args.expected_cleanup_sha256,
                "owner_sentinel_sha256": owner_sentinel_sha256,
                "sentinel_sha256": sentinel_sha256,
                "producer_implementation_sha256":
                    args.expected_producer_implementation_sha256,
                "observation_evidence_sha256":
                    observation_evidence_sha256,
                "pre_state_sha256": pre_state_sha256,
                "expected_post_state_sha256": expected_post_state_sha256,
                "actual_post_state_sha256": actual_post_state_sha256,
            }
        ),
        "rollback_assertion_count": 16,
        "failed_rollback_assertion_count": 0 if rollback_success else 1,
        "residual_file_count": actual_post_state["file_count"],
        "residual_byte_count": actual_post_state["byte_count"],
        "rollback_success": rollback_success,
        "receipt_outside_target": True,
    }
    receipt["receipt_sha256"] = digest(receipt)
    receipt_path.write_bytes(canonical_bytes(receipt))
    if inventory(target) != actual_post_state:
        raise SystemExit("S236B_CLEANUP_POST_RECEIPT_STATE_CHANGED")
    print(
        canonical_bytes(
            {
                "schema_version": "s236b.rollback-summary.v3",
                "receipt_sha256": receipt["receipt_sha256"],
                "reason_code": args.reason_code,
                "root_role": role,
                "rollback_success": rollback_success,
                "residual_file_count": actual_post_state["file_count"],
            }
        ).decode("utf-8")
    )
    return 0 if rollback_success else 1


if __name__ == "__main__":
    raise SystemExit(main())
