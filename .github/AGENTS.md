# .github guidance

- All CI workflows must use the principle of least privilege for secrets and token permissions.
- Never commit or print secrets in workflow logs.
- Use separate jobs for code analysis and PR comments with distinct minimal permissions.
- Document any new required secrets or environment variables in the workflow or README.
- Never modify workflow permissions or add new external integrations without a human-decision.
- Use workflow concurrency and `cancel-in-progress` to avoid duplicate runs.
- Do not run code from forks with write permissions; limit repair tasks to trusted branches.
