#!/usr/bin/env python3
"""Create machine-observed, path-bound S236B rollback fault fixtures."""

from __future__ import annotations

import argparse
import errno
import hashlib
import json
import os
import re
import secrets
import signal
import subprocess
import sys
from pathlib import Path


OWNER_NAME = ".s236b-root-owner.json"
SENTINEL_NAME = ".s236b-cleanup-sentinel.json"
EVIDENCE_NAME = "cleanup-evidence.bodyless.json"
SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")


def canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def path_sha256(path: Path) -> str:
    return hashlib.sha256(path.as_posix().encode("utf-8")).hexdigest()


def guard_target(target_input: Path, approved_parent_input: Path) -> tuple[Path, Path]:
    if target_input.is_symlink() or approved_parent_input.is_symlink():
        raise SystemExit("S236B_FAULT_PRODUCER_SYMLINK_REFUSED")
    target = target_input.resolve()
    approved_parent = approved_parent_input.resolve()
    repository = Path(__file__).resolve().parents[2]
    if (
        not approved_parent.is_dir()
        or target.parent != approved_parent
        or not target.name.startswith("s236b-fault-")
        or not target.is_dir()
        or any(target.iterdir())
    ):
        raise SystemExit("S236B_FAULT_PRODUCER_TARGET_INVALID")
    try:
        target.relative_to(repository)
    except ValueError:
        return target, approved_parent
    raise SystemExit("S236B_FAULT_PRODUCER_REFUSED_GIT_WORKTREE")


def observe_missing_model(target: Path) -> dict[str, object]:
    missing_model = target / "intentionally-absent-model.bin"
    if missing_model.exists():
        raise SystemExit("S236B_FAULT_PRODUCER_MODEL_UNEXPECTEDLY_EXISTS")
    observed = False
    try:
        missing_model.open("rb")
    except FileNotFoundError:
        observed = True
    if not observed:
        raise SystemExit("S236B_FAULT_PRODUCER_MISSING_MODEL_NOT_OBSERVED")
    return {
        "candidate_execution_started": False,
        "missing_model_preload_failure_observed": True,
    }


def observe_network_denial(
    network_deny_library: Path,
    expected_network_deny_sha256: str,
) -> dict[str, object]:
    if (
        not network_deny_library.is_file()
        or file_sha256(network_deny_library)
        != expected_network_deny_sha256
    ):
        raise SystemExit("S236B_FAULT_PRODUCER_NETWORK_SHIM_MISMATCH")
    source = (
        "import errno,socket,sys\n"
        "try:\n"
        " socket.socket(socket.AF_INET,socket.SOCK_STREAM)\n"
        "except OSError as e:\n"
        " sys.exit(0 if e.errno==errno.EPERM else 2)\n"
        "sys.exit(3)\n"
    )
    environment = {
        "LD_PRELOAD": str(network_deny_library.resolve()),
        "PATH": "/usr/bin:/bin",
    }
    observed = subprocess.run(
        [sys.executable, "-I", "-c", source],
        check=False,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=environment,
        timeout=5,
    )
    if observed.returncode != 0:
        raise SystemExit("S236B_FAULT_PRODUCER_NETWORK_DENIAL_NOT_OBSERVED")
    return {
        "socket_creation_denial_errno": errno.errorcode[errno.EPERM],
        "network_socket_attempt_count": 1,
    }


def observe_timeout() -> dict[str, object]:
    try:
        subprocess.run(
            [sys.executable, "-I", "-c", "import time;time.sleep(30)"],
            check=False,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=0.05,
        )
    except subprocess.TimeoutExpired:
        return {
            "supervisor_timeout_observed": True,
            "timed_out_process_terminated": True,
        }
    raise SystemExit("S236B_FAULT_PRODUCER_TIMEOUT_NOT_OBSERVED")


def observe_interrupt() -> dict[str, object]:
    process = subprocess.Popen(
        [sys.executable, "-I", "-c", "import time;time.sleep(30)"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    process.terminate()
    return_code = process.wait(timeout=5)
    if return_code != -signal.SIGTERM:
        raise SystemExit("S236B_FAULT_PRODUCER_INTERRUPT_NOT_OBSERVED")
    return {
        "interrupt_signal": "SIGTERM",
        "process_exit_observed": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--approved-parent", type=Path, required=True)
    parser.add_argument("--expected-producer-sha256", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--candidate-configuration-sha256", required=True)
    parser.add_argument(
        "--benchmark-configuration-bundle-sha256", required=True
    )
    parser.add_argument("--fixture-manifest-sha256", required=True)
    parser.add_argument(
        "--reason-code",
        choices=(
            "missing_model_preload_failure",
            "network_denial",
            "mid_run_timeout",
            "interrupted_execution",
        ),
        required=True,
    )
    parser.add_argument("--network-deny-library", type=Path)
    parser.add_argument("--expected-network-deny-sha256")
    args = parser.parse_args()
    for value in (
        args.expected_producer_sha256,
        args.candidate_configuration_sha256,
        args.benchmark_configuration_bundle_sha256,
        args.fixture_manifest_sha256,
    ):
        if not SHA256_PATTERN.fullmatch(value):
            raise SystemExit("S236B_FAULT_PRODUCER_DIGEST_INVALID")
    if (
        file_sha256(Path(__file__)) != args.expected_producer_sha256
        or not args.run_id
        or len(args.run_id) > 128
    ):
        raise SystemExit("S236B_FAULT_PRODUCER_IDENTITY_INVALID")
    target, approved_parent = guard_target(
        args.target,
        args.approved_parent,
    )

    if args.reason_code == "missing_model_preload_failure":
        observation = observe_missing_model(target)
    elif args.reason_code == "network_denial":
        if (
            args.network_deny_library is None
            or args.expected_network_deny_sha256 is None
            or not SHA256_PATTERN.fullmatch(
                args.expected_network_deny_sha256
            )
        ):
            raise SystemExit("S236B_FAULT_PRODUCER_NETWORK_SHIM_REQUIRED")
        observation = observe_network_denial(
            args.network_deny_library,
            args.expected_network_deny_sha256,
        )
    elif args.reason_code == "mid_run_timeout":
        observation = observe_timeout()
    else:
        observation = observe_interrupt()

    root_instance_nonce = secrets.token_hex(32)
    parent_sha256 = path_sha256(approved_parent)
    basename_sha256 = hashlib.sha256(
        target.name.encode("utf-8")
    ).hexdigest()
    locator_sha256 = path_sha256(target)
    owner = {
        "schema_version": "s236b.root-owner-sentinel.v2",
        "run_id": args.run_id,
        "root_role": "fault",
        "root_instance_nonce": root_instance_nonce,
        "approved_parent_sha256": parent_sha256,
        "target_basename_sha256": basename_sha256,
        "target_locator_sha256": locator_sha256,
        "candidate_configuration_sha256":
            args.candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.benchmark_configuration_bundle_sha256,
    }
    owner_path = target / OWNER_NAME
    owner_path.write_bytes(canonical_bytes(owner))
    owner_sha256 = file_sha256(owner_path)
    payload = target / "ephemeral-fault-payload.bin"
    payload.write_bytes(secrets.token_bytes(64))
    evidence = {
        "schema_version": "s236b.cleanup-observation-evidence.v2",
        "run_id": args.run_id,
        "root_role": "fault",
        "root_instance_nonce": root_instance_nonce,
        "approved_parent_sha256": parent_sha256,
        "target_basename_sha256": basename_sha256,
        "target_locator_sha256": locator_sha256,
        "candidate_configuration_sha256":
            args.candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.benchmark_configuration_bundle_sha256,
        "fixture_manifest_sha256": args.fixture_manifest_sha256,
        "reason_code": args.reason_code,
        "outcome_observed": True,
        "producer_implementation_sha256": args.expected_producer_sha256,
        "observation_nonce": secrets.token_hex(32),
        "producer_observation": observation,
        "attestation_status":
            "local_machine_observation_not_independently_attested",
    }
    evidence_path = target / EVIDENCE_NAME
    evidence_path.write_bytes(canonical_bytes(evidence))
    evidence_sha256 = file_sha256(evidence_path)
    sentinel = {
        "schema_version": "s236b.cleanup-target-sentinel.v2",
        "run_id": args.run_id,
        "root_role": "fault",
        "root_instance_nonce": root_instance_nonce,
        "approved_parent_sha256": parent_sha256,
        "target_basename_sha256": basename_sha256,
        "target_locator_sha256": locator_sha256,
        "candidate_configuration_sha256":
            args.candidate_configuration_sha256,
        "benchmark_configuration_bundle_sha256":
            args.benchmark_configuration_bundle_sha256,
        "fixture_manifest_sha256": args.fixture_manifest_sha256,
        "reason_code": args.reason_code,
        "owner_sentinel_sha256": owner_sha256,
        "producer_implementation_sha256": args.expected_producer_sha256,
        "observation_evidence_relative_path": EVIDENCE_NAME,
        "observation_evidence_sha256": evidence_sha256,
    }
    sentinel_path = target / SENTINEL_NAME
    sentinel_path.write_bytes(canonical_bytes(sentinel))
    print(
        canonical_bytes(
            {
                "schema_version": "s236b.rollback-fault-summary.v1",
                "reason_code": args.reason_code,
                "owner_sentinel_sha256": owner_sha256,
                "observation_evidence_sha256": evidence_sha256,
                "sentinel_sha256": file_sha256(sentinel_path),
                "producer_implementation_sha256":
                    args.expected_producer_sha256,
                "payload_file_count": 1,
            }
        ).decode("utf-8")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
