# YOOTS MULTI-AGENT ENGINEERING PROTOCOL v1

Introduced: 2026-08-17. This is an additive operating standard for humans, ChatGPT/orchestrator, Claude Code, Codex and future Yoots Digital Employees working in this repository.

## Source of truth
Before non-trivial work read the current repository state, local Project OS/current-state/task/decision/risk/deployment docs, tests/CI/runtime evidence, then the current task packet. Chat/model memory is orientation only when it conflicts with GitHub or evidence.

## Roles and routing
- `human:zhanat`: owner/approver; business intent and consequential approvals.
- `ai:chatgpt-orchestrator`: orientation, decomposition, direct low-risk repo work, Work Packets, review and reconciliation.
- `runtime:claude-code` / `runtime:codex`: coding executors when terminal/browser/build/debugging/large implementation is needed.
- `employee:<id>`: persistent Yoots Digital Employee identity when an assignment exists; the employee is not the same thing as the runtime/model.

Use Level A direct/orchestrator work for bounded, verifiable low/medium-risk changes. Escalate to Level B coding runtime for shell, dependency/build/test loops, browser/e2e, complex refactor/debugging or substantial multi-file implementation. Level C human approval is required before production deploys, Cloudflare/DNS/routes, secrets/credentials, irreversible migrations/destructive data changes, financial actions, real-client bulk publication/outreach, privileged merges or security-policy relaxation.

## Work Packet
A coding runtime should receive: TASK ID, GOAL, BASE branch/SHA, IN-SCOPE files, MUST REUSE, MUST NOT/no-touch, acceptance criteria, verification commands/evidence, and expected branch/commit/PR + Project OS/log updates. Do not resend the whole project history when a bounded context pack is sufficient.

## Safety
- Existing repository-specific instructions are authoritative; stricter rules win.
- Do not delete, rename, overwrite, rewrite history, force-push or mass-format unrelated files without explicit task scope.
- Non-trivial writes go to a dedicated branch unless local rules are stricter.
- Do not merge protocol/docs changes automatically: main changes may trigger CI/CD/Cloudflare.
- Protocol adoption itself must not change application code, production, Cloudflare Workers/Pages/D1/R2/KV/Queues, DNS/domains/subdomains/routes, secrets, migrations, tenant boundaries, index/noindex behavior or client data.
- Never store secrets, raw credentials, private chain-of-thought, unnecessary PII or sensitive client payloads in Git/logs.

## Independent verification
The executor is not automatically the verifier. Review the actual diff, scope, acceptance criteria, tests/build/CI, regressions, secrets/PII and production claims. Record `PASS`, `PASS WITH FOLLOW-UPS`, or `FAIL/BLOCKED` with concrete evidence.

## Daily Operations Ledger
Every day with meaningful work gets a daily ledger. Reuse an existing Project OS daily path if one exists; otherwise use `docs/operations/DAILY/YYYY-MM-DD.md`.

Keep separate:
- `ACTION`: what an actor actually did.
- `FACT`: what was learned with evidence.
- `DECISION`: what was chosen, by whom and why.
- `STATE CHANGE`: what actually changed in repo/runtime/provider/production.

When known record `requested_by`, `planned_by`, `assigned_to`, `executed_by`, `verified_by`, `approved_by`, task ID, branch/base SHA/commit/PR, changed scope, tests/CI/provider evidence, blockers and exact next action.

Daily history never replaces CURRENT/PROJECT STATE, TASK REGISTRY, ADR/DECISION REGISTER or release/deployment records.

## Completion
A meaningful task is not DONE because a model says so. Prefer:
`Task ID -> branch -> commit(s) -> tests/evidence -> PR/result -> independent review -> Project OS reconciliation -> exact next action`.

If instructions conflict or state is uncertain, preserve existing state, stop the consequential action, document the conflict and escalate.