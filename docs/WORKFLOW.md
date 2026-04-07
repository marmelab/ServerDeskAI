# Development Workflow

## One Task at a Time

Each plan task is implemented on its own branch, then submitted as a PR for review.

### Steps

1. **Create a branch** from the current base (last merged or last feature branch):
   ```bash
   git checkout -b feat/taskN-<short-description>
   ```

2. **Implement the task** following the plan steps exactly.

3. **Verify** — run lint and build before committing:
   ```bash
   npm run lint
   npm run build
   ```

4. **Commit** with a descriptive message, then **open a PR** for agent review:
   ```bash
   git push -u origin feat/taskN-<short-description>
   gh pr create --title "..." --body "..."
   ```

5. **After PR is reviewed and merged**, start the next task from the updated base branch.

### Branch Naming

`feat/taskN-<kebab-case-description>` — e.g., `feat/task11-customers`

### PR Review

PRs should be reviewed by an agent (code-reviewer) before merging.
The PR body should summarize what was implemented and include a test plan.
