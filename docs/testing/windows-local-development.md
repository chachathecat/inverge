# Windows local development

The repository declares LF for tracked text in `.gitattributes`. This keeps
source bytes stable across Linux and Windows checkouts, including when the
machine-level Git setting enables `core.autocrlf`.

For the least surprising Windows setup, use a fresh clone and set the local
Git preference before installing dependencies:

```powershell
git config core.autocrlf false
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --workers=1
npm.cmd run build
git diff --check
```

Use `npm.cmd` and `npx.cmd` from PowerShell because script execution policy can
block the PowerShell shims. Test helpers normalize fixture text and repository
paths at their comparison boundaries; application and governance values are not
rewritten to make platform checks pass.

To inspect checkout state, run `git ls-files --eol`. Tracked source should show
`i/lf` and, after a checkout governed by `.gitattributes`, `w/lf`. Binary image
and audio fixtures are explicitly exempt from text conversion.
