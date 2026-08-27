# GitHub automation rules

- Use minimum required `GITHUB_TOKEN` permissions for every job.
- Never expose secrets, tokens, cookies, credentials, or environment values in logs or artifacts.
- Never run write-capable workflows with secrets against fork pull-request code.
- Do not use required-check skipping to obtain a green result.
- Runtime-required checks must fail when required evidence or configuration is missing.
- Use stable check names and `cancel-in-progress` concurrency for superseded PR runs.
- Workflow, permissions, branch protection, and release-authority changes require human approval. After the HIGH-risk V2 workflow amendment is approved and merged, only its exact fail-closed LOW/MEDIUM Ready-and-squash path is automated; it derives semantic HIGH signals from the complete patch, requires live prior-lane receipts and order/concurrency evidence, and fully revalidates after Ready. HIGH remains human-approved.
- Automated repair is limited to trusted same-repository branches and a maximum of three attempts.
