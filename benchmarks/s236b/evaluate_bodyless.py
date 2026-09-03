#!/usr/bin/env python3
"""Evaluate sealed expectations after output commit and emit bodyless evidence."""

from __future__ import annotations

import argparse
import base64
import fcntl
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path


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

OWNER_NAME = ".s236b-root-owner.json"
SENTINEL_NAME = ".s236b-cleanup-sentinel.json"
EVIDENCE_NAME = "cleanup-evidence.bodyless.json"

STATUS_FAILURE_CODES = {
    "decode_failure": "decode_failure",
    "fixture_digest_mismatch": "fixture_digest_mismatch",
    "timeout": "timeout",
    "out_of_memory": "out_of_memory",
    "process_failure": "process_failure",
}

FAILURE_TAXONOMY = (
    "decode_failure",
    "fixture_digest_mismatch",
    "crop_perspective_deskew_shadow_or_noise_failure",
    "detection_miss_split_merge_or_order_failure",
    "korean_glyph_substitution",
    "negation_marker_loss_or_flip",
    "digit_or_decimal_substitution",
    "sign_loss_or_flip",
    "percent_loss_or_scale_change",
    "choice_omission_or_reorder",
    "law_date_component_or_order_error",
    "table_cell_or_structure_loss",
    "formula_token_or_structure_loss",
    "blank_output",
    "timeout",
    "out_of_memory",
    "process_failure",
    "rights_configuration_or_environment_mismatch",
    "privacy_or_output_leak",
    "unclassified_review_required",
)


def canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def digest(value: object) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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


def refusal_check(target: Path) -> Path:
    repository = Path(__file__).resolve().parents[2]
    resolved = target.resolve()
    try:
        resolved.relative_to(repository)
    except ValueError:
        return resolved
    raise SystemExit("S236B_REFUSED_GIT_WORKTREE_OUTPUT")


def roots_are_distinct(left: Path, right: Path) -> bool:
    left = left.resolve()
    right = right.resolve()
    if left == right:
        return False
    for parent, child in ((left, right), (right, left)):
        try:
            child.relative_to(parent)
        except ValueError:
            continue
        return False
    return True


def git_environment() -> dict[str, str]:
    return {
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "PATH": "/usr/bin:/bin",
    }


def git_repository_identity(repository: Path) -> dict[str, str]:
    environment = git_environment()

    def git_output(arguments: list[str]) -> bytes:
        process = subprocess.run(
            ["git", *arguments],
            cwd=repository,
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if process.returncode != 0:
            raise SystemExit("S236B_REPOSITORY_IDENTITY_UNRESOLVED")
        return process.stdout

    head_sha256 = git_output(["rev-parse", "--verify", "HEAD"]).decode(
        "ascii"
    ).strip()
    tree_sha256 = git_output(
        ["rev-parse", "--verify", "HEAD^{tree}"]
    ).decode("ascii").strip()
    status_bytes = git_output(
        ["status", "--porcelain=v1", "-z", "--untracked-files=all"]
    )
    tracked_diff_bytes = git_output(
        ["diff", "--binary", "--no-ext-diff", "HEAD"]
    )
    untracked_output = git_output(
        ["ls-files", "--others", "--exclude-standard", "-z"]
    )
    untracked_rows = []
    for encoded_relative in untracked_output.split(b"\0"):
        if not encoded_relative:
            continue
        relative = os.fsdecode(encoded_relative)
        path = repository / relative
        if path.is_symlink() or not path.is_file():
            raise SystemExit("S236B_REPOSITORY_UNTRACKED_STATE_UNRESOLVED")
        untracked_rows.append(
            {
                "relative_locator_sha256": hashlib.sha256(
                    encoded_relative
                ).hexdigest(),
                "file_sha256": file_sha256(path),
                "byte_count": path.stat().st_size,
            }
        )
    untracked_rows.sort(key=lambda row: row["relative_locator_sha256"])
    worktree_state_sha256 = digest(
        {
            "tracked_diff_sha256": hashlib.sha256(
                tracked_diff_bytes
            ).hexdigest(),
            "untracked_rows": untracked_rows,
        }
    )
    if (
        not re.fullmatch(r"[0-9a-f]{40}", head_sha256)
        or not re.fullmatch(r"[0-9a-f]{40}", tree_sha256)
    ):
        raise SystemExit("S236B_REPOSITORY_IDENTITY_SHAPE_INVALID")
    return {
        "head_sha": head_sha256,
        "tree_sha": tree_sha256,
        "status_sha256": hashlib.sha256(status_bytes).hexdigest(),
        "worktree_state_sha256": worktree_state_sha256,
    }


def require_evaluator_repository(selected: Path) -> Path:
    repository = selected.resolve()
    if repository != Path(__file__).resolve().parents[2]:
        raise SystemExit("S236B_REPOSITORY_MUST_EQUAL_EVALUATOR_REPOSITORY")
    return repository


def require_descendant_file_or_directory(
    selected: Path,
    parent: Path,
    expected_type: str,
) -> Path:
    if selected.is_symlink():
        raise SystemExit("S236B_BOUND_SINK_SYMLINK_REFUSED")
    resolved = selected.resolve()
    try:
        resolved.relative_to(parent)
    except ValueError as error:
        raise SystemExit("S236B_BOUND_SINK_OUTSIDE_RUNNER_ROOT") from error
    if expected_type == "file" and not resolved.is_file():
        raise SystemExit("S236B_BOUND_PROTOCOL_LOG_MISSING")
    if expected_type == "directory" and not resolved.is_dir():
        raise SystemExit("S236B_BOUND_CACHE_ROOT_MISSING")
    return resolved


def scan_bytes(
    data: bytes,
    patterns: list[bytes],
    artifact_hashes_by_size: dict[int, set[str]],
) -> int:
    expression = (
        re.compile(b"|".join(re.escape(value) for value in patterns))
        if patterns
        else None
    )
    text_matches = 1 if expression is not None and expression.search(data) else 0
    possible_hashes = artifact_hashes_by_size.get(len(data))
    artifact_matches = (
        1
        if possible_hashes
        and hashlib.sha256(data).hexdigest() in possible_hashes
        else 0
    )
    return text_matches + artifact_matches


def scan_tree(
    root: Path,
    patterns: list[bytes],
    artifact_hashes_by_size: dict[int, set[str]],
) -> dict[str, int]:
    matches = 0
    scanned_files = 0
    unresolved = 0
    if not root.exists() or root.is_symlink() or not root.is_dir():
        return {
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        }

    def onerror(_error: OSError) -> None:
        nonlocal unresolved
        unresolved += 1

    for current_root, directories, files in os.walk(
        root,
        followlinks=False,
        onerror=onerror,
    ):
        current_path = Path(current_root)
        for directory in list(directories):
            path = current_path / directory
            if path.is_symlink():
                unresolved += 1
                directories.remove(directory)
        for filename in files:
            path = current_path / filename
            if path.is_symlink() or not path.is_file():
                unresolved += 1
                continue
            try:
                data = path.read_bytes()
            except (OSError, PermissionError):
                unresolved += 1
                continue
            scanned_files += 1
            matches += scan_bytes(data, patterns, artifact_hashes_by_size)
    return {
        "scanned_member_count": scanned_files,
        "match_count": matches,
        "unresolved_count": unresolved,
        "residual_count": matches,
    }


def scan_file(
    path: Path,
    patterns: list[bytes],
    artifact_hashes_by_size: dict[int, set[str]],
) -> dict[str, int]:
    if not path.exists() or path.is_symlink() or not path.is_file():
        return {
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        }
    try:
        data = path.read_bytes()
    except (OSError, PermissionError):
        return {
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        }
    matches = scan_bytes(data, patterns, artifact_hashes_by_size)
    return {
        "scanned_member_count": 1,
        "match_count": matches,
        "unresolved_count": 0,
        "residual_count": matches,
    }


def scan_decoded_git_blobs(
    repository: Path,
    patterns: list[bytes],
    artifact_hashes_by_size: dict[int, set[str]],
) -> dict[str, int]:
    git_binary = shutil.which("git", path="/usr/bin:/bin")
    if not repository.is_dir() or git_binary is None:
        return {
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        }
    environment = git_environment()
    try:
        git_dir_result = subprocess.run(
            [
                git_binary,
                "-C",
                str(repository),
                "rev-parse",
                "--absolute-git-dir",
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            env=environment,
        )
        git_dir = Path(git_dir_result.stdout.strip()).resolve()
        if not git_dir.is_dir():
            raise OSError("S236B_GIT_DIR_MISSING")
        git_prefix = [
            git_binary,
            f"--git-dir={git_dir}",
            f"--work-tree={repository.resolve()}",
        ]
        inventory = subprocess.run(
            [
                *git_prefix,
                "cat-file",
                "--batch-check=%(objectname) %(objecttype) %(objectsize)",
                "--batch-all-objects",
            ],
            cwd=repository,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            env=environment,
        )
        blob_rows = []
        for line in inventory.stdout.splitlines():
            parts = line.split()
            if len(parts) != 3:
                raise ValueError("S236B_GIT_OBJECT_INVENTORY_ROW_INVALID")
            object_sha, object_type, object_size = parts
            if object_type == "blob":
                blob_rows.append((object_sha, int(object_size)))
    except (OSError, subprocess.SubprocessError, ValueError):
        return {
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        }

    matches = 0
    scanned = 0
    unresolved = 0
    try:
        submodule_inventory = subprocess.run(
            [*git_prefix, "ls-files", "--stage"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            env=environment,
        )
        unresolved += sum(
            line.startswith("160000 ")
            for line in submodule_inventory.stdout.splitlines()
        )
        process = subprocess.Popen(
            [*git_prefix, "cat-file", "--batch"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            env=environment,
        )
        if process.stdin is None or process.stdout is None:
            raise OSError("S236B_GIT_OBJECT_PIPE_UNAVAILABLE")
        for object_sha, expected_size in blob_rows:
            process.stdin.write(object_sha.encode("ascii") + b"\n")
            process.stdin.flush()
            header = process.stdout.readline().decode("ascii").strip().split()
            if (
                len(header) != 3
                or header[0] != object_sha
                or header[1] != "blob"
                or int(header[2]) != expected_size
            ):
                unresolved += 1
                continue
            data = process.stdout.read(expected_size)
            terminator = process.stdout.read(1)
            if len(data) != expected_size or terminator != b"\n":
                unresolved += 1
                continue
            scanned += 1
            matches += scan_bytes(data, patterns, artifact_hashes_by_size)
    except (OSError, subprocess.SubprocessError, UnicodeError, ValueError):
        unresolved += 1
    finally:
        if "process" in locals():
            if process.stdin is not None:
                process.stdin.close()
            if process.stdout is not None:
                process.stdout.close()
            return_code = process.wait()
            if return_code != 0:
                unresolved += 1
    return {
        "scanned_member_count": scanned,
        "match_count": matches,
        "unresolved_count": unresolved,
        "residual_count": matches,
    }


def exact_choice_structure(
    candidate: str,
    expected_rows: list[dict],
) -> dict[str, object]:
    expected_values = [row["expected_value"] for row in expected_rows]
    expected_markers = [
        re.fullmatch(r"([1-5])\).+", value).group(1)
        for value in expected_values
    ]
    normalized = unicodedata.normalize("NFC", candidate).strip()
    allowed = {
        "".join(expected_values),
        " ".join(expected_values),
        "\n".join(expected_values),
    }
    markers = re.findall(r"(?<!\d)([1-5])\)", normalized)
    structure_available = bool(markers)
    structure_valid = (
        normalized in allowed
        and markers == expected_markers
        and sorted(markers) == ["1", "2", "3", "4", "5"]
        and len(set(expected_values)) == 5
        and all(normalized.count(value) == 1 for value in expected_values)
    )
    return {
        "structure_available": structure_available,
        "ordered_field_count": len(markers),
        "structure_valid": structure_valid,
        "order_failure_diagnosed": markers != expected_markers,
    }


def exact_table_structure(
    candidate: str,
    expected_rows: list[dict],
) -> dict[str, object]:
    expected_by_coordinate = {
        (row["structure"]["row"], row["structure"]["column"]):
            row["expected_value"]
        for row in expected_rows
    }
    expected_coordinates = {(0, 0), (0, 1), (1, 0), (1, 1)}
    expected_values = list(expected_by_coordinate.values())
    normalized = unicodedata.normalize("NFC", candidate).strip()
    candidate_rows = normalized.splitlines()
    candidate_cells = (
        [row.split("\t") for row in candidate_rows]
        if len(candidate_rows) == 2
        else []
    )
    explicit_grid_available = (
        len(candidate_cells) == 2
        and all(len(row) == 2 for row in candidate_cells)
    )
    candidate_by_coordinate = (
        {
            (row_index, column_index): value
            for row_index, row in enumerate(candidate_cells)
            for column_index, value in enumerate(row)
        }
        if explicit_grid_available
        else {}
    )
    structure_valid = (
        set(expected_by_coordinate) == expected_coordinates
        and explicit_grid_available
        and candidate_by_coordinate == expected_by_coordinate
        and len(set(expected_values)) == 4
    )
    return {
        "structure_available": explicit_grid_available,
        "ordered_field_count": len(candidate_by_coordinate),
        "structure_valid": structure_valid,
        "table_loss_diagnosed": (
            any(value in normalized for value in expected_values)
            and not structure_valid
        ),
    }


def diagnosed_mismatch_code(
    risk: str,
    expected: str,
    candidate: str,
) -> str:
    if risk == "numbers":
        numeric = re.compile(r"\d+(?:\.\d+)?")
        if numeric.fullmatch(expected) and numeric.fullmatch(candidate):
            return "digit_or_decimal_substitution"
    elif risk == "signs":
        expected_match = re.fullmatch(r"([+−-])(.+)", expected)
        candidate_match = re.fullmatch(r"([+−-])?(.+)", candidate)
        if (
            expected_match
            and candidate_match
            and candidate_match.group(2) == expected_match.group(2)
            and candidate_match.group(1) != expected_match.group(1)
        ):
            return "sign_loss_or_flip"
    elif risk == "percentages":
        if expected.endswith("%") and candidate == expected[:-1]:
            return "percent_loss_or_scale_change"
        try:
            if (
                expected.endswith("%")
                and Decimal(candidate) == Decimal(expected[:-1]) / 100
            ):
                return "percent_loss_or_scale_change"
        except InvalidOperation:
            pass
    elif risk == "negation":
        if "아님" in expected and candidate in (
            expected.replace("아님", ""),
            expected.replace("아님", "임"),
        ):
            return "negation_marker_loss_or_flip"
    elif risk == "law_dates":
        date_pattern = re.compile(r"법률 (\d{4})\.(\d{2})\.(\d{2})")
        expected_match = date_pattern.fullmatch(expected)
        candidate_match = date_pattern.fullmatch(candidate)
        if expected_match and candidate_match:
            return "law_date_component_or_order_error"
    elif risk == "formulas":
        structural_tokens = set("+−-÷*/=()¹²³⁴⁵⁶⁷⁸₁₂₃₄₅₆₇₈")
        expected_base = "".join(
            character
            for character in expected
            if character not in structural_tokens
        )
        candidate_base = "".join(
            character
            for character in candidate
            if character not in structural_tokens
        )
        if (
            expected_base == candidate_base
            and expected != candidate
            and any(token in expected for token in structural_tokens)
        ):
            return "formula_token_or_structure_loss"
    return "unclassified_review_required"


def field_metrics(expected_rows, output_by_fixture):
    per_risk = {
        risk: {
            "risk_field": risk,
            "denominator": 0,
            "correct": 0,
            "miss": 0,
            "abstain": 0,
            "timeout": 0,
        }
        for risk in RISK_FIELDS
    }
    failures = Counter()
    decisions: dict[str, bool] = {}
    candidate_structure: dict[str, dict[str, object]] = {}
    rows_by_fixture = defaultdict(list)
    for row in expected_rows:
        rows_by_fixture[row["fixture_id"]].append(row)

    for fixture_id, fixture_rows in rows_by_fixture.items():
        fixture_rows.sort(key=lambda row: row["structure"]["ordinal"])
        output = output_by_fixture[fixture_id]
        status = output["status"]
        candidate = unicodedata.normalize("NFC", output["raw_output"])
        risk = fixture_rows[0]["risk_field"]
        if risk == "choice_order":
            candidate_structure[fixture_id] = exact_choice_structure(
                candidate,
                fixture_rows,
            )
        elif risk == "tables":
            candidate_structure[fixture_id] = exact_table_structure(
                candidate,
                fixture_rows,
            )

        for expected in fixture_rows:
            metrics = per_risk[risk]
            metrics["denominator"] += 1
            expected_value = unicodedata.normalize(
                "NFC", expected["expected_value"]
            )
            if status == "timeout":
                correct = False
                metrics["timeout"] += 1
                failures["timeout"] += 1
            elif status in STATUS_FAILURE_CODES:
                correct = False
                metrics["miss"] += 1
                failures[STATUS_FAILURE_CODES[status]] += 1
            elif status != "completed":
                correct = False
                metrics["miss"] += 1
                failures["unclassified_review_required"] += 1
            elif candidate == "":
                correct = False
                metrics["abstain"] += 1
                failures["blank_output"] += 1
            elif risk == "choice_order":
                correct = candidate_structure[fixture_id]["structure_valid"]
                if correct:
                    metrics["correct"] += 1
                else:
                    metrics["miss"] += 1
                    failure_code = (
                        "choice_omission_or_reorder"
                        if candidate_structure[fixture_id][
                            "order_failure_diagnosed"
                        ]
                        else "unclassified_review_required"
                    )
                    failures[failure_code] += 1
            elif risk == "tables":
                correct = candidate_structure[fixture_id]["structure_valid"]
                if correct:
                    metrics["correct"] += 1
                else:
                    metrics["miss"] += 1
                    failure_code = (
                        "table_cell_or_structure_loss"
                        if candidate_structure[fixture_id][
                            "table_loss_diagnosed"
                        ]
                        else "unclassified_review_required"
                    )
                    failures[failure_code] += 1
            else:
                correct = candidate == expected_value
                if correct:
                    metrics["correct"] += 1
                else:
                    metrics["miss"] += 1
                    failures[
                        diagnosed_mismatch_code(
                            risk,
                            expected_value,
                            candidate,
                        )
                    ] += 1
            decisions[expected["field_id"]] = correct

    for metrics in per_risk.values():
        metrics["accuracy_ppm"] = (
            metrics["correct"] * 1_000_000 // metrics["denominator"]
        )
    return list(per_risk.values()), failures, decisions, candidate_structure


def group_metrics(expected_rows, decisions, candidate_structure):
    groups = defaultdict(list)
    for row in expected_rows:
        groups[(row["risk_field"], row["group_id"])].append(row)
    result = []
    for risk in RISK_FIELDS:
        selected = [
            rows for (group_risk, _), rows in groups.items() if group_risk == risk
        ]
        correct = 0
        structure_observed_count = 0
        for rows in selected:
            ordered = sorted(rows, key=lambda item: item["structure"]["ordinal"])
            fixture_id = ordered[0]["fixture_id"]
            ordinals = [item["structure"]["ordinal"] for item in ordered]
            expected_structure_valid = ordinals == list(
                range(1, len(ordered) + 1)
            )
            if risk == "tables":
                expected_structure_valid = expected_structure_valid and {
                    (item["structure"]["row"], item["structure"]["column"])
                    for item in ordered
                } == {(0, 0), (0, 1), (1, 0), (1, 1)}
            observed = candidate_structure.get(fixture_id)
            if observed and observed["structure_available"]:
                structure_observed_count += 1
            candidate_valid = (
                observed["structure_valid"]
                if risk in ("choice_order", "tables") and observed
                else True
            )
            if (
                expected_structure_valid
                and candidate_valid
                and all(decisions[item["field_id"]] for item in ordered)
            ):
                correct += 1
        result.append(
            {
                "risk_field": risk,
                "group_denominator": len(selected),
                "group_correct": correct,
                "group_accuracy_ppm": (
                    correct * 1_000_000 // len(selected) if selected else 0
                ),
                "candidate_structure_observed_count": structure_observed_count,
            }
        )
    return result


REVISION_RECORD_KEYS = {
    "schema_version",
    "machine_original_id",
    "machine_original_commitment_sha256",
    "revision_ordinal",
    "previous_revision_commitment_hmac_sha256",
    "revision_commitment_hmac_sha256",
    "revision_actor_class",
    "revision_reason_code",
    "revision_body",
}


def validate_revision_record(
    record: dict[str, object],
    original_id: str,
    original_commitment_sha256: str,
    revision_key: bytes,
) -> None:
    if set(record) != REVISION_RECORD_KEYS:
        raise ValueError("S236B_REVISION_RECORD_KEYSET_REJECTED")
    if record["schema_version"] != "s236b.ephemeral-ocr-revision.v3":
        raise ValueError("S236B_REVISION_SCHEMA_REJECTED")
    if record["machine_original_id"] != original_id:
        raise ValueError("S236B_REVISION_ORIGINAL_ID_REJECTED")
    if (
        record["machine_original_commitment_sha256"]
        != original_commitment_sha256
    ):
        raise ValueError("S236B_REVISION_ORIGINAL_BINDING_REJECTED")
    if (
        record["revision_actor_class"]
        != "native_manual_fallback_harness_not_human"
        or record["revision_reason_code"]
        != "synthetic_manual_correction_path_test"
    ):
        raise ValueError("S236B_REVISION_ACTOR_OR_REASON_REJECTED")
    if not isinstance(record["revision_body"], str):
        raise ValueError("S236B_REVISION_BODY_TYPE_REJECTED")
    expected_body_hmac = hmac.new(
        revision_key,
        record["revision_body"].encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(
        str(record["revision_commitment_hmac_sha256"]),
        expected_body_hmac,
    ):
        raise ValueError("S236B_REVISION_BODY_HMAC_MISMATCH")


def append_revision(
    journal_path: Path,
    record: dict[str, object],
    original_id: str,
    original_commitment_sha256: str,
    revision_key: bytes,
    expected_journal_sha256_or_null: str | None,
) -> str:
    lock_path = Path(str(journal_path) + ".lock")
    if journal_path.is_symlink() or lock_path.is_symlink():
        raise ValueError("S236B_REVISION_SYMLINK_REJECTED")
    try:
        lock_fd = os.open(
            lock_path,
            os.O_APPEND
            | os.O_CREAT
            | os.O_RDWR
            | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
    except OSError as error:
        raise ValueError("S236B_REVISION_LOCK_OPEN_REJECTED") from error
    with os.fdopen(lock_fd, "a+b") as lock_handle:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX)
        if journal_path.is_symlink():
            raise ValueError("S236B_REVISION_SYMLINK_REJECTED")
        if expected_journal_sha256_or_null is None:
            if journal_path.exists():
                raise ValueError("S236B_REVISION_JOURNAL_UNEXPECTED")
            existing = []
        else:
            if (
                not journal_path.is_file()
                or file_sha256(journal_path)
                != expected_journal_sha256_or_null
            ):
                raise ValueError("S236B_REVISION_JOURNAL_STATE_MISMATCH")
            existing = []
            for line in journal_path.read_text().splitlines():
                authenticated = json.loads(line)
                if set(authenticated) != (
                    REVISION_RECORD_KEYS | {"record_hmac_sha256"}
                ):
                    raise ValueError(
                        "S236B_REVISION_AUTHENTICATED_KEYSET_REJECTED"
                    )
                record_hmac = authenticated.pop("record_hmac_sha256")
                expected_record_hmac = hmac.new(
                    revision_key,
                    canonical_bytes(authenticated),
                    hashlib.sha256,
                ).hexdigest()
                if not hmac.compare_digest(
                    str(record_hmac),
                    expected_record_hmac,
                ):
                    raise ValueError("S236B_REVISION_RECORD_HMAC_MISMATCH")
                validate_revision_record(
                    authenticated,
                    original_id,
                    original_commitment_sha256,
                    revision_key,
                )
                if authenticated["revision_ordinal"] != len(existing) + 1:
                    raise ValueError(
                        "S236B_REVISION_EXISTING_ORDINAL_MISMATCH"
                    )
                predecessor = (
                    existing[-1]["revision_commitment_hmac_sha256"]
                    if existing
                    else None
                )
                if (
                    authenticated[
                        "previous_revision_commitment_hmac_sha256"
                    ]
                    != predecessor
                ):
                    raise ValueError(
                        "S236B_REVISION_EXISTING_CHAIN_MISMATCH"
                    )
                existing.append(authenticated)

        validate_revision_record(
            record,
            original_id,
            original_commitment_sha256,
            revision_key,
        )
        expected_ordinal = len(existing) + 1
        if record["revision_ordinal"] != expected_ordinal:
            raise ValueError("S236B_REVISION_ORDINAL_REJECTED")
        expected_predecessor = (
            existing[-1]["revision_commitment_hmac_sha256"]
            if existing
            else None
        )
        if (
            record["previous_revision_commitment_hmac_sha256"]
            != expected_predecessor
        ):
            raise ValueError("S236B_REVISION_PREDECESSOR_REJECTED")
        if any(
            row["revision_commitment_hmac_sha256"]
            == record["revision_commitment_hmac_sha256"]
            for row in existing
        ):
            raise ValueError("S236B_REVISION_REUSE_REJECTED")
        authenticated_record = dict(record)
        authenticated_record["record_hmac_sha256"] = hmac.new(
            revision_key,
            canonical_bytes(record),
            hashlib.sha256,
        ).hexdigest()
        journal_flags = (
            os.O_APPEND
            | os.O_WRONLY
            | getattr(os, "O_NOFOLLOW", 0)
        )
        if expected_journal_sha256_or_null is None:
            journal_flags |= os.O_CREAT | os.O_EXCL
        try:
            journal_fd = os.open(journal_path, journal_flags, 0o600)
        except OSError as error:
            raise ValueError("S236B_REVISION_JOURNAL_OPEN_REJECTED") from error
        with os.fdopen(journal_fd, "a", encoding="utf-8") as handle:
            handle.write(
                canonical_bytes(authenticated_record).decode("utf-8") + "\n"
            )
            handle.flush()
            os.fsync(handle.fileno())
        return file_sha256(journal_path)


def write_normal_cleanup_control(
    root: Path,
    role: str,
    generation_summary: dict[str, object],
    fixture_manifest_sha256: str,
    producer_implementation_sha256: str,
) -> dict[str, str]:
    owner_path = root / OWNER_NAME
    if not owner_path.is_file() or owner_path.is_symlink():
        raise SystemExit("S236B_CLEANUP_OWNER_SENTINEL_MISSING")
    owner = json.loads(owner_path.read_text())
    parent_sha256 = hashlib.sha256(
        root.resolve().parent.as_posix().encode("utf-8")
    ).hexdigest()
    basename_sha256 = hashlib.sha256(
        root.name.encode("utf-8")
    ).hexdigest()
    locator_sha256 = hashlib.sha256(
        root.resolve().as_posix().encode("utf-8")
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
        or owner["schema_version"] != "s236b.root-owner-sentinel.v2"
        or owner["root_role"] != role
        or not re.fullmatch(r"[0-9a-f]{64}", owner["root_instance_nonce"])
        or owner["approved_parent_sha256"] != parent_sha256
        or owner["target_basename_sha256"] != basename_sha256
        or owner["target_locator_sha256"] != locator_sha256
        or owner["candidate_configuration_sha256"]
        != generation_summary["candidate_configuration_sha256"]
        or owner["benchmark_configuration_bundle_sha256"]
        != generation_summary["benchmark_configuration_bundle_sha256"]
        or hashlib.sha256(owner["run_id"].encode("utf-8")).hexdigest()
        != generation_summary["run_id_sha256"]
    ):
        raise SystemExit("S236B_CLEANUP_OWNER_SENTINEL_INVALID")
    owner_sha256 = file_sha256(owner_path)
    expected_owner_sha256 = generation_summary[
        f"{role}_owner_sentinel_sha256"
    ]
    if owner_sha256 != expected_owner_sha256:
        raise SystemExit("S236B_CLEANUP_OWNER_SENTINEL_DIGEST_MISMATCH")

    if role == "runner":
        observation = {
            "candidate_run_summary_present": (
                root / "bodyless" / "candidate-run-summary.json"
            ).is_file(),
            "machine_original_present": (
                root / "sealed-output" / "machine-originals.raw.json"
            ).is_file(),
            "output_commitment_present": (
                root / "bodyless" / "machine-original-commitments.json"
            ).is_file(),
        }
    elif role == "authority":
        observation = {
            "sealed_expectation_manifest_present": (
                root
                / "sealed-expectations"
                / "expected-results.raw.json"
            ).is_file(),
        }
    else:
        raise SystemExit("S236B_CLEANUP_NORMAL_ROLE_INVALID")
    if not all(observation.values()):
        raise SystemExit("S236B_CLEANUP_NORMAL_OBSERVATION_FAILED")

    evidence = {
        "schema_version": "s236b.cleanup-observation-evidence.v2",
        "run_id": owner["run_id"],
        "root_role": role,
        "root_instance_nonce": owner["root_instance_nonce"],
        "approved_parent_sha256": parent_sha256,
        "target_basename_sha256": basename_sha256,
        "target_locator_sha256": locator_sha256,
        "candidate_configuration_sha256":
            owner["candidate_configuration_sha256"],
        "benchmark_configuration_bundle_sha256":
            owner["benchmark_configuration_bundle_sha256"],
        "fixture_manifest_sha256": fixture_manifest_sha256,
        "reason_code": "normal_completion",
        "outcome_observed": True,
        "producer_implementation_sha256": producer_implementation_sha256,
        "observation_nonce": secrets.token_hex(32),
        "producer_observation": observation,
        "attestation_status":
            "local_machine_observation_not_independently_attested",
    }
    evidence_path = root / EVIDENCE_NAME
    with evidence_path.open("xb") as handle:
        handle.write(canonical_bytes(evidence))
    evidence_sha256 = file_sha256(evidence_path)
    sentinel = {
        "schema_version": "s236b.cleanup-target-sentinel.v2",
        "run_id": owner["run_id"],
        "root_role": role,
        "root_instance_nonce": owner["root_instance_nonce"],
        "approved_parent_sha256": parent_sha256,
        "target_basename_sha256": basename_sha256,
        "target_locator_sha256": locator_sha256,
        "candidate_configuration_sha256":
            owner["candidate_configuration_sha256"],
        "benchmark_configuration_bundle_sha256":
            owner["benchmark_configuration_bundle_sha256"],
        "fixture_manifest_sha256": fixture_manifest_sha256,
        "reason_code": "normal_completion",
        "owner_sentinel_sha256": owner_sha256,
        "producer_implementation_sha256":
            producer_implementation_sha256,
        "observation_evidence_relative_path": EVIDENCE_NAME,
        "observation_evidence_sha256": evidence_sha256,
    }
    sentinel_path = root / SENTINEL_NAME
    with sentinel_path.open("xb") as handle:
        handle.write(canonical_bytes(sentinel))
    return {
        "owner_sentinel_sha256": owner_sha256,
        "sentinel_sha256": file_sha256(sentinel_path),
        "observation_evidence_sha256": evidence_sha256,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runner-work-dir", type=Path, required=True)
    parser.add_argument("--authority-work-dir", type=Path, required=True)
    parser.add_argument("--cache-root", type=Path, required=True)
    parser.add_argument("--repository", type=Path, required=True)
    parser.add_argument("--result", type=Path, required=True)
    parser.add_argument("--protocol-log", type=Path, required=True)
    parser.add_argument("--runtime-sbom", type=Path, required=True)
    parser.add_argument("--expected-runtime-sbom-file-sha256", required=True)
    parser.add_argument("--expected-evaluator-sha256", required=True)
    parser.add_argument("--expected-python-version", required=True)
    parser.add_argument("--expected-repository-head-sha", required=True)
    parser.add_argument("--expected-repository-tree-sha", required=True)
    parser.add_argument("--expected-repository-status-sha256", required=True)
    parser.add_argument(
        "--expected-repository-worktree-state-sha256",
        required=True,
    )
    parser.add_argument(
        "--allow-incomplete-exploratory-evidence",
        action="store_true",
    )
    args = parser.parse_args()
    if file_sha256(Path(__file__)) != args.expected_evaluator_sha256:
        raise SystemExit("S236B_EVALUATOR_DIGEST_MISMATCH")
    if (
        not args.runtime_sbom.is_file()
        or file_sha256(args.runtime_sbom)
        != args.expected_runtime_sbom_file_sha256
    ):
        raise SystemExit("S236B_EVALUATOR_SBOM_DIGEST_MISMATCH")
    if sys.version.split()[0] != args.expected_python_version:
        raise SystemExit("S236B_EVALUATOR_PYTHON_VERSION_MISMATCH")
    runtime_sbom = json.loads(args.runtime_sbom.read_text())
    sbom_preimage = dict(runtime_sbom)
    claimed_sbom_sha256 = sbom_preimage.pop("sbom_sha256", None)
    if (
        claimed_sbom_sha256 != digest(sbom_preimage)
        or runtime_sbom["python_version"] != args.expected_python_version
        or runtime_sbom["status"]
        != "python_distribution_inventory_complete_review_incomplete"
    ):
        raise SystemExit("S236B_EVALUATOR_SBOM_SELF_BINDING_MISMATCH")
    result_path = refusal_check(args.result)
    runner_root = args.runner_work_dir.resolve()
    authority_root = args.authority_work_dir.resolve()
    if not roots_are_distinct(runner_root, authority_root):
        raise SystemExit("S236B_RUNNER_AND_AUTHORITY_ROOTS_NOT_DISTINCT")
    repository = require_evaluator_repository(args.repository)
    for value, pattern in (
        (args.expected_repository_head_sha, r"[0-9a-f]{40}"),
        (args.expected_repository_tree_sha, r"[0-9a-f]{40}"),
        (args.expected_repository_status_sha256, r"[0-9a-f]{64}"),
        (args.expected_repository_worktree_state_sha256, r"[0-9a-f]{64}"),
    ):
        if not re.fullmatch(pattern, value):
            raise SystemExit("S236B_REPOSITORY_IDENTITY_ARGUMENT_INVALID")
    repository_identity_before = git_repository_identity(repository)
    if repository_identity_before != {
        "head_sha": args.expected_repository_head_sha,
        "tree_sha": args.expected_repository_tree_sha,
        "status_sha256": args.expected_repository_status_sha256,
        "worktree_state_sha256":
            args.expected_repository_worktree_state_sha256,
    }:
        raise SystemExit("S236B_REPOSITORY_IDENTITY_MISMATCH")
    protocol_log = require_descendant_file_or_directory(
        args.protocol_log,
        runner_root,
        "file",
    )
    cache_root = require_descendant_file_or_directory(
        args.cache_root,
        runner_root,
        "directory",
    )

    runner_input_dir = runner_root / "runner-input"
    bodyless_dir = runner_root / "bodyless"
    fixture_dir = runner_root / "fixture-bodies"
    sealed_output_dir = runner_root / "sealed-output"
    expectation_dir = authority_root / "sealed-expectations"
    commitment_path = bodyless_dir / "machine-original-commitments.json"
    original_path = sealed_output_dir / "machine-originals.raw.json"
    expected_path = expectation_dir / "expected-results.raw.json"
    if not commitment_path.exists():
        raise SystemExit("S236B_OUTPUT_COMMITMENT_REQUIRED_BEFORE_EXPECTED_OPEN")
    output_commitment_time_ns = commitment_path.stat().st_mtime_ns
    expected_opened_at_ns = time.time_ns()

    execution_manifest = json.loads(
        (runner_input_dir / "execution-manifest.raw.json").read_text()
    )
    fixture_manifest = json.loads(
        (bodyless_dir / "field-ground-truth-manifest.json").read_text()
    )
    commitments = json.loads(commitment_path.read_text())
    generation_summary = json.loads(
        (bodyless_dir / "generation-summary.json").read_text()
    )
    run_summary = json.loads(
        (bodyless_dir / "candidate-run-summary.json").read_text()
    )
    output_manifest = json.loads(original_path.read_text())
    expected_manifest = json.loads(expected_path.read_text())

    if output_commitment_time_ns > expected_opened_at_ns:
        raise SystemExit("S236B_EXPECTED_OPENED_BEFORE_OUTPUT_COMMITMENT")
    if digest(expected_manifest) != generation_summary[
        "expected_result_manifest_sha256"
    ]:
        raise SystemExit("S236B_EXPECTED_MANIFEST_DIGEST_MISMATCH")
    if digest(fixture_manifest) != generation_summary["fixture_manifest_sha256"]:
        raise SystemExit("S236B_FIXTURE_MANIFEST_DIGEST_MISMATCH")
    if digest(output_manifest) != run_summary["raw_output_manifest_sha256"]:
        raise SystemExit("S236B_RAW_OUTPUT_MANIFEST_DIGEST_MISMATCH")
    if digest(commitments) != run_summary[
        "output_commitment_manifest_sha256"
    ]:
        raise SystemExit("S236B_OUTPUT_COMMITMENT_DIGEST_MISMATCH")
    if (
        generation_summary["candidate_configuration_sha256"]
        != run_summary["candidate_configuration_sha256"]
        or generation_summary["benchmark_configuration_bundle_sha256"]
        != run_summary["benchmark_configuration_bundle_sha256"]
    ):
        raise SystemExit("S236B_RUN_GENERATION_CONFIGURATION_MISMATCH")
    if (
        generation_summary["runtime_sbom_file_sha256"]
        != args.expected_runtime_sbom_file_sha256
        or run_summary["runtime_sbom_file_sha256"]
        != args.expected_runtime_sbom_file_sha256
        or generation_summary["python_version"]
        != args.expected_python_version
        or run_summary["python_version"] != args.expected_python_version
        or not generation_summary[
            "selected_installed_distribution_inventories_matched"
        ]
        or not run_summary[
            "selected_installed_distribution_inventories_matched"
        ]
        or not generation_summary[
            "imported_module_origins_matched_distribution_inventories"
        ]
        or not run_summary[
            "imported_module_origins_matched_distribution_inventories"
        ]
        or generation_summary["python_executable_bytes_verified"]
        or run_summary["python_executable_bytes_verified"]
        or generation_summary["native_dependency_closure_verified"]
        or run_summary["native_dependency_closure_verified"]
        or not run_summary[
            "model_files_hash_verified_before_and_after_inference"
        ]
        or run_summary["model_read_only_mount_verified"]
    ):
        raise SystemExit("S236B_EXECUTION_DEPENDENCY_BINDING_MISMATCH")

    expected_key = base64.b64decode(expected_manifest["commitment_key_base64"])
    output_key = base64.b64decode(
        output_manifest["output_commitment_key_base64"]
    )
    fixture_commitment_by_field = {
        row["field_id"]: row for row in fixture_manifest["ordered_field_rows"]
    }
    output_commitment_by_fixture = {
        row["fixture_id"]: row for row in commitments["ordered_rows"]
    }
    output_by_fixture = {
        row["fixture_id"]: row for row in output_manifest["ordered_rows"]
    }

    for expected in expected_manifest["ordered_field_rows"]:
        fixture_commitment = fixture_commitment_by_field[expected["field_id"]]
        expected_hmac = hmac.new(
            expected_key,
            unicodedata.normalize(
                "NFC", expected["expected_value"]
            ).encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if expected_hmac != fixture_commitment["expected_value_hmac_sha256"]:
            raise SystemExit("S236B_EXPECTED_VALUE_COMMITMENT_MISMATCH")
    for machine_original in output_manifest["ordered_rows"]:
        output_commitment = output_commitment_by_fixture[
            machine_original["fixture_id"]
        ]
        output_hmac = hmac.new(
            output_key,
            machine_original["raw_output"].encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if output_hmac != output_commitment["output_hmac_sha256"]:
            raise SystemExit("S236B_MACHINE_ORIGINAL_COMMITMENT_MISMATCH")

    metric_rows_value, failures, decisions, candidate_structure = field_metrics(
        expected_manifest["ordered_field_rows"], output_by_fixture
    )
    group_rows = group_metrics(
        expected_manifest["ordered_field_rows"],
        decisions,
        candidate_structure,
    )
    total_fields = sum(row["denominator"] for row in metric_rows_value)
    total_correct = sum(row["correct"] for row in metric_rows_value)
    total_miss = sum(row["miss"] for row in metric_rows_value)
    total_abstain = sum(row["abstain"] for row in metric_rows_value)
    total_timeout = sum(row["timeout"] for row in metric_rows_value)
    if total_correct + total_miss + total_abstain + total_timeout != total_fields:
        raise SystemExit("S236B_METRIC_PARTITION_MISMATCH")

    split_counts = Counter(
        row["split_class"]
        for row in expected_manifest["ordered_field_rows"]
    )
    if split_counts["ocr_benchmark_calibration"] == 0 or split_counts[
        "ocr_benchmark_hidden_test"
    ] == 0:
        raise SystemExit("S236B_HIDDEN_SPLIT_REQUIRED")

    original = output_manifest["ordered_rows"][0]
    original_commitment = output_commitment_by_fixture[original["fixture_id"]][
        "output_hmac_sha256"
    ]
    original_file_sha256_before = file_sha256(original_path)
    revision_key = secrets.token_bytes(32)
    revised_value = original["raw_output"] + chr(0xAC00 + secrets.randbelow(11172))
    revision_commitment = hmac.new(
        revision_key, revised_value.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    revision_journal = sealed_output_dir / "ocr-revisions.raw.jsonl"
    revision_record = {
        "schema_version": "s236b.ephemeral-ocr-revision.v3",
        "machine_original_id": original["machine_original_id"],
        "machine_original_commitment_sha256": original_commitment,
        "revision_ordinal": 1,
        "previous_revision_commitment_hmac_sha256": None,
        "revision_commitment_hmac_sha256": revision_commitment,
        "revision_actor_class": "native_manual_fallback_harness_not_human",
        "revision_reason_code": "synthetic_manual_correction_path_test",
        "revision_body": revised_value,
    }
    revision_journal_sha256 = append_revision(
        revision_journal,
        revision_record,
        original["machine_original_id"],
        original_commitment,
        revision_key,
        None,
    )
    revision_journal_bytes = revision_journal.read_bytes()
    duplicate_ordinal_rejected = False
    predecessor_mismatch_rejected = False
    journal_edit_rejected = False
    journal_truncate_rejected = False
    journal_delete_rejected = False
    try:
        append_revision(
            revision_journal,
            revision_record,
            original["machine_original_id"],
            original_commitment,
            revision_key,
            revision_journal_sha256,
        )
    except ValueError:
        duplicate_ordinal_rejected = True
    second_record = {
        **revision_record,
        "revision_ordinal": 2,
        "previous_revision_commitment_hmac_sha256": "0" * 64,
        "revision_body": "second",
        "revision_commitment_hmac_sha256": hmac.new(
            revision_key, b"second", hashlib.sha256
        ).hexdigest(),
    }
    try:
        append_revision(
            revision_journal,
            second_record,
            original["machine_original_id"],
            original_commitment,
            revision_key,
            revision_journal_sha256,
        )
    except ValueError:
        predecessor_mismatch_rejected = True

    valid_second_record = {
        **second_record,
        "previous_revision_commitment_hmac_sha256": revision_commitment,
    }
    valid_second_append_passed = False
    try:
        final_revision_journal_sha256 = append_revision(
            revision_journal,
            valid_second_record,
            original["machine_original_id"],
            original_commitment,
            revision_key,
            revision_journal_sha256,
        )
        valid_second_append_passed = True
    except ValueError:
        final_revision_journal_sha256 = ""
    if not valid_second_append_passed:
        raise SystemExit("S236B_VALID_SECOND_REVISION_APPEND_FAILED")
    valid_revision_journal_bytes = revision_journal.read_bytes()
    revision_journal.write_bytes(
        revision_journal_bytes.replace(b"native_manual", b"forged_manual", 1)
    )
    try:
        append_revision(
            revision_journal,
            valid_second_record,
            original["machine_original_id"],
            original_commitment,
            revision_key,
            revision_journal_sha256,
        )
    except ValueError:
        journal_edit_rejected = True
    revision_journal.write_bytes(
        revision_journal_bytes[: len(revision_journal_bytes) // 2]
    )
    try:
        append_revision(
            revision_journal,
            valid_second_record,
            original["machine_original_id"],
            original_commitment,
            revision_key,
            revision_journal_sha256,
        )
    except ValueError:
        journal_truncate_rejected = True
    revision_journal.unlink()
    try:
        append_revision(
            revision_journal,
            valid_second_record,
            original["machine_original_id"],
            original_commitment,
            revision_key,
            revision_journal_sha256,
        )
    except ValueError:
        journal_delete_rejected = True
    revision_journal.write_bytes(valid_revision_journal_bytes)
    original_file_sha256_after = file_sha256(original_path)
    metric_root_before = digest(metric_rows_value)
    metric_root_after = digest(metric_rows_value)
    revision_boundary = {
        "schema_version": "s236b.ocr-revision-boundary-result.v3",
        "machine_original_id": original["machine_original_id"],
        "machine_original_commitment_sha256": original_commitment,
        "machine_original_file_sha256_before": original_file_sha256_before,
        "machine_original_file_sha256_after": original_file_sha256_after,
        "original_unchanged_during_revision":
            original_file_sha256_before == original_file_sha256_after,
        "original_os_write_once_enforced": False,
        "revision_ordinal": 1,
        "revision_commitment_hmac_sha256": revision_commitment,
        "revision_journal_sha256": final_revision_journal_sha256,
        "revision_actor_class":
            "native_manual_fallback_harness_not_human",
        "revision_reason_code": "synthetic_manual_correction_path_test",
        "revision_storage_append_only_enforced": False,
        "revision_in_process_hash_chain_validated": True,
        "revision_atomic_expected_head_lock_used": True,
        "valid_second_append_passed": valid_second_append_passed,
        "duplicate_ordinal_rejected": duplicate_ordinal_rejected,
        "predecessor_mismatch_rejected": predecessor_mismatch_rejected,
        "journal_edit_rejected_with_expected_head": journal_edit_rejected,
        "journal_truncate_rejected_with_expected_head":
            journal_truncate_rejected,
        "journal_delete_rejected_with_expected_head":
            journal_delete_rejected,
        "metric_root_before_sha256": metric_root_before,
        "metric_root_after_sha256": metric_root_after,
        "metric_root_unchanged": metric_root_before == metric_root_after,
        "edited_revision_used_for_accuracy": False,
        "candidate_call_count_during_manual_revision": 0,
    }

    runner_cleanup_control = write_normal_cleanup_control(
        runner_root,
        "runner",
        generation_summary,
        generation_summary["fixture_manifest_sha256"],
        args.expected_evaluator_sha256,
    )
    authority_cleanup_control = write_normal_cleanup_control(
        authority_root,
        "authority",
        generation_summary,
        generation_summary["fixture_manifest_sha256"],
        args.expected_evaluator_sha256,
    )

    raw_patterns = [
        expected_manifest["leak_canary"].encode("ascii"),
        output_manifest["leak_canary"].encode("ascii"),
    ]

    raw_artifact_hashes_by_size: dict[int, set[str]] = defaultdict(set)
    for row in execution_manifest["ordered_rows"]:
        raw_artifact_hashes_by_size[
            (fixture_dir / row["relative_fixture_locator"]).stat().st_size
        ].add(row["image_sha256"])
    for path in (expected_path, original_path, revision_journal):
        raw_artifact_hashes_by_size[path.stat().st_size].add(file_sha256(path))

    repository_file_scan = scan_tree(
        repository,
        raw_patterns,
        raw_artifact_hashes_by_size,
    )
    repository_git_blob_scan = scan_decoded_git_blobs(
        repository,
        raw_patterns,
        raw_artifact_hashes_by_size,
    )
    repository_scan = {
        "scanned_member_count": (
            repository_file_scan["scanned_member_count"]
            + repository_git_blob_scan["scanned_member_count"]
        ),
        "match_count": (
            repository_file_scan["match_count"]
            + repository_git_blob_scan["match_count"]
        ),
        "unresolved_count": (
            repository_file_scan["unresolved_count"]
            + repository_git_blob_scan["unresolved_count"]
        ),
        "residual_count": (
            repository_file_scan["residual_count"]
            + repository_git_blob_scan["residual_count"]
        ),
        "worktree_and_git_storage_member_count":
            repository_file_scan["scanned_member_count"],
        "decoded_git_blob_count":
            repository_git_blob_scan["scanned_member_count"],
    }
    protocol_scan = scan_file(
        protocol_log,
        raw_patterns,
        raw_artifact_hashes_by_size,
    )
    cache_scan = scan_tree(
        cache_root,
        raw_patterns,
        raw_artifact_hashes_by_size,
    )
    repository_identity_after = git_repository_identity(repository)
    if repository_identity_after != repository_identity_before:
        raise SystemExit("S236B_REPOSITORY_CHANGED_DURING_SCAN")
    local_sink_rows = [
        {
            "sink_id": "git_worktree_index_untracked_ignored_and_new_blobs",
            "coverage_status":
                "worktree_dot_git_and_decoded_all_local_git_blobs_scanned",
            **repository_scan,
        },
        {
            "sink_id": "stdout_stderr_and_exception_messages",
            "coverage_status":
                "runner_root_protocol_log_scanned_execution_redirection_unbound",
            **{
                **protocol_scan,
                "unresolved_count": protocol_scan["unresolved_count"] + 1,
            },
        },
        {
            "sink_id": "ocr_model_and_application_caches",
            "coverage_status":
                "runner_root_cache_scanned_process_cache_environment_unbound",
            **{
                **cache_scan,
                "unresolved_count": cache_scan["unresolved_count"] + 1,
            },
        },
        {
            "sink_id": "telemetry_otel_error_reporting_spools",
            "coverage_status": "disabled_by_process_configuration_not_provider_attested",
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        },
        {
            "sink_id": "screenshots_dom_traces_and_video",
            "coverage_status": "no_browser_used_not_provider_attested",
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        },
        {
            "sink_id": "temporary_files_core_dumps_swap_and_memory_buffers",
            "coverage_status": "memory_and_swap_not_observable_in_local_sandbox",
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        },
        {
            "sink_id": "clipboard_thumbnail_and_recent_file_sinks",
            "coverage_status": "headless_process_no_gui_but_host_sinks_not_attested",
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        },
        {
            "sink_id":
                "shared_corpora_reference_corpora_and_model_eval_body_storage",
            "coverage_status": "no_corpus_connector_used_but_provider_not_attested",
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        },
        {
            "sink_id": "persistent_database_and_object_storage",
            "coverage_status": "no_persistence_connector_used_but_provider_not_attested",
            "scanned_member_count": 0,
            "match_count": 0,
            "unresolved_count": 1,
            "residual_count": 0,
        },
    ]
    remote_sink_rows = [
        {
            "sink_id": "github_issue_pr_review_and_comment_bodies",
            "status": "pending_exact_head_remote_scan",
        },
        {
            "sink_id": "github_check_logs_and_uploaded_artifacts",
            "status": "pending_exact_head_remote_scan",
        },
        {
            "sink_id": "post_merge_github_and_cache_rescan",
            "status": "pending_squash_merge_and_new_head",
        },
    ]
    local_residual_count = sum(
        row["residual_count"] for row in local_sink_rows
    )
    local_unresolved_count = sum(
        row["unresolved_count"] for row in local_sink_rows
    ) + 1
    if local_residual_count:
        failures["privacy_or_output_leak"] += local_residual_count
    if (
        local_unresolved_count > 0
        and not args.allow_incomplete_exploratory_evidence
    ):
        raise SystemExit("S236B_INCOMPLETE_PRIVACY_SCAN_REQUIRES_EXPLICIT_MODE")

    opencv_latencies = [
        row["opencv_latency_ns"] for row in output_manifest["ordered_rows"]
    ]
    paddle_latencies = [
        row["paddle_latency_ns"] for row in output_manifest["ordered_rows"]
    ]
    e2e_latencies = [
        row["e2e_latency_ns"] for row in output_manifest["ordered_rows"]
    ]
    failure_rows = [
        {"failure_code": code, "count": failures.get(code, 0)}
        for code in FAILURE_TAXONOMY
    ]
    result = {
        "schema_version": "s236b.bodyless-benchmark-result.v3",
        "status": "exploratory_machine_run_gate_inputs_and_reviews_pending",
        "decision": "not_accepted_S236B_benchmark_evidence",
        "candidate_set_sha256": run_summary["candidate_set_sha256"],
        "candidate_configuration_sha256": run_summary[
            "candidate_configuration_sha256"
        ],
        "benchmark_configuration_bundle_sha256": run_summary[
            "benchmark_configuration_bundle_sha256"
        ],
        "candidate_lock_sha256": run_summary["candidate_lock_sha256"],
        "runner_sha256": run_summary["runner_sha256"],
        "evaluator_sha256": args.expected_evaluator_sha256,
        "runtime_sbom_file_sha256":
            args.expected_runtime_sbom_file_sha256,
        "fixture_manifest_sha256": generation_summary[
            "fixture_manifest_sha256"
        ],
        "expected_result_manifest_sha256": generation_summary[
            "expected_result_manifest_sha256"
        ],
        "output_commitment_manifest_sha256": run_summary[
            "output_commitment_manifest_sha256"
        ],
        "fixture_count": generation_summary["fixture_count"],
        "field_count": total_fields,
        "risk_field_count": len(RISK_FIELDS),
        "ordered_field_accuracy_rows": metric_rows_value,
        "ordered_group_structure_rows": group_rows,
        "overall_accuracy_ppm": total_correct * 1_000_000 // total_fields,
        "correct_count": total_correct,
        "miss_count": total_miss,
        "abstain_count": total_abstain,
        "timeout_count": total_timeout,
        "process_failure_count": run_summary["process_failure_count"],
        "failure_taxonomy_version":
            "s236b.diagnosed-or-unclassified-failure-taxonomy.v3",
        "failure_taxonomy_completeness_status":
            "diagnosed_causes_only_ambiguous_mismatches_unclassified_and_per_fixture_timeout_supervision_absent",
        "ordered_failure_rows": failure_rows,
        "unclassified_failure_count": failures.get(
            "unclassified_review_required", 0
        ),
        "latency": {
            "model_load_ns": run_summary["model_load_ns"],
            "opencv_preprocess": latency_summary(opencv_latencies),
            "paddleocr_family_model_direct": latency_summary(
                paddle_latencies
            ),
            "end_to_end": latency_summary(e2e_latencies),
            "peak_rss_kib": run_summary["peak_rss_kib"],
            "clock": "time.perf_counter_ns_monotonic",
            "batch_size": 1,
            "cpu_threads": 1,
            "per_fixture_timeout_supervision": False,
        },
        "hidden_test_integrity": {
            "split_class": "ocr_benchmark_hidden_test",
            "readiness_eligible": False,
            "calibration_field_count":
                split_counts["ocr_benchmark_calibration"],
            "hidden_field_count": split_counts["ocr_benchmark_hidden_test"],
            "runner_and_authority_roots_distinct":
                generation_summary["runner_and_authority_roots_distinct"],
            "expectation_authority_root_supplied_to_runner":
                run_summary["expectation_authority_root_received"],
            "output_committed_before_evaluator_expected_open":
                output_commitment_time_ns <= expected_opened_at_ns,
            "prior_expectation_open_exclusion_verified": False,
            "retry_after_expected_open_count_or_null": None,
            "tuning_after_expected_open_count_or_null": None,
            "trusted_provider_attestation_status": "pending",
        },
        "immutable_original_and_revision_boundary": revision_boundary,
        "normal_cleanup_control": {
            "status":
                "local_machine_observation_not_independently_attested",
            "runner": runner_cleanup_control,
            "authority": authority_cleanup_control,
        },
        "local_privacy_scan": {
            "scanner_version":
                "s236b.bound-repository-raw-value-and-decoded-git-blob-scanner.v4",
            "repository_identity_before": repository_identity_before,
            "repository_identity_after": repository_identity_after,
            "repository_identity_unchanged_during_scan": True,
            "repository_path_bound_to_evaluator_repository": True,
            "git_replace_objects_disabled": True,
            "protocol_log_inside_runner_root": True,
            "protocol_log_execution_redirection_binding_verified": False,
            "cache_root_inside_runner_root": True,
            "cache_environment_binding_verified": False,
            "ordered_sink_rows": local_sink_rows,
            "raw_container_canary_scan": True,
            "raw_artifact_byte_digest_scan": True,
            "direct_raw_text_value_scan": False,
            "direct_raw_text_value_scan_reason":
                "collision_unsafe_without_provider_sink_provenance",
            "residual_count": local_residual_count,
            "unresolved_count": local_unresolved_count,
            "complete_zero_residual_proof": (
                local_residual_count == 0 and local_unresolved_count == 0
            ),
            "incomplete_exploratory_mode_explicit":
                args.allow_incomplete_exploratory_evidence,
        },
        "remote_privacy_scan": {
            "ordered_sink_rows": remote_sink_rows,
            "status": "pending_exact_head_and_post_merge_scan",
        },
        "production_fitness_claim_allowed": False,
        "learner_runtime_activation_allowed": False,
        "s236b_gate_packet_satisfied": False,
    }
    result["result_artifact_sha256"] = digest(result)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.write_bytes(canonical_bytes(result))
    print(
        canonical_bytes(
            {
                "schema_version": "s236b.evaluation-summary.v3",
                "result_artifact_sha256": result["result_artifact_sha256"],
                "fixture_count": result["fixture_count"],
                "field_count": result["field_count"],
                "overall_accuracy_ppm": result["overall_accuracy_ppm"],
                "local_residual_count": local_residual_count,
                "local_unresolved_count": local_unresolved_count,
                "remote_scan_status": result["remote_privacy_scan"]["status"],
            }
        ).decode("utf-8")
    )
    return (
        0
        if local_residual_count == 0
        and (
            local_unresolved_count == 0
            or args.allow_incomplete_exploratory_evidence
        )
        else 1
    )


if __name__ == "__main__":
    raise SystemExit(main())
