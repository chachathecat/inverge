Visual Lexicon Autonomous Delivery Contract

This repository powers the Visual Lexicon App. To support unattended delivery, the following rules MUST be followed by all autonomous agents:

1. Scope definition: Each issue must define the goal, non-goals, and acceptance criteria, and must be linked to the appropriate roadmap item in roadmap/active-program.yml.
2. No human questions for routine choices: Do not ask the user about file names, styling details, or minor implementation decisions. If there is no clear default, make a reasonable choice that aligns with existing patterns and components.
3. Screen and golden set integrity: Modifications that affect the golden visual set or screenshot regression tests are HIGH RISK. Never update golden images without creating a new set under visual_tests/golden/ and including visual diffs in the PR.
4. Test first: Always review existing visual regression tests and unit tests. Add or update tests as necessary before implementing changes.
5. Zero regression policy: Do not weaken or remove tests to make CI pass. All visual snapshots must either match the golden set or be deliberately updated through a new golden set review.
6. CI and linting: The following commands must pass before opening a PR: npm run typecheck, npm run lint, npm run test, and npm run visual-test.
7. Human approvals: High-risk changes—such as UI redesigns, changes to data models, or modifications to screenshot tests—must be marked with the human-decision label and require explicit user approval before merging.
8. One PR per issue: Every issue produces exactly one PR linked via Closes #<issue_number>. Do not batch unrelated work together.
9. Rollback ready: For every data migration or schema change, provide a rollback plan. For visual snapshot changes, provide a clear explanation of why the golden set was updated.
10. Stop conditions: Cease autonomous work and request a human decision if the task requires a change of scope, introduces a new external service, requires secret credentials, or encounters repeated CI failures that cannot be resolved within three attempts.
