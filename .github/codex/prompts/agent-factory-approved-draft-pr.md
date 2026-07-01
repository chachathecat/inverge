# AF018 Approval-Gated Draft PR Prompt

You are running inside the Inverge Agent Factory AF018 GitHub-Codex connected workflow.

Read first:

- `AGENTS.md`
- `docs/agent-factory-github-codex-connected.md`
- `.agent-factory/codex-task-packages.md`
- `.agent-factory/af018-draft-pr-plan.md` when present
- `roadmap/active-program.yml`

AF018 is a narrow approved write path. Work only on the selected task package and keep the diff small.

Required boundaries:

- Do not create commits, push branches, open pull requests, rerun workflows, merge, rebase, or mark a PR ready.
- Do not edit `.github/workflows/`, auth, billing, payment, provider, OCR adapter, instructor, academy, production-data, secret, or local official-material paths.
- Do not add raw learner answers, OCR text, problem or answer bodies, provider payloads, billing/auth/payment data, private user content, credentials, or secret-like values to source files, artifacts, comments, or prompts.
- Do not broaden learner-facing scope beyond the Korean appraiser second-round exam.
- Do not make official grading, official model-answer, pass-probability, or pass-guarantee claims.

Implementation rules:

- Prefer the repository's existing Agent Factory patterns.
- Keep changed files within the AF018 path allowlist; the workflow will fail closed after this run if paths are outside the allowlist.
- Do not modify generated `.agent-factory/` artifacts.
- Leave validation and PR creation to the workflow after Codex exits.

Final response:

Write a concise implementation summary and list changed files. Do not include diffs, raw logs, raw prompts, raw learner/OCR/problem/provider/private content, or secrets.
