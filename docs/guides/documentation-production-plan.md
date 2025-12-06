---
FrontmatterVersion: 1
DocumentType: Guide
Title: Documentation Production Plan
Summary: End-to-end productionization plan covering gaps, remediation tracks, and verification for @fathym/cli docs.
Created: 2025-12-01
Updated: 2025-12-01
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Readiness Checklist
    Path: ./documentation-readiness.md
  - Label: AI Collaboration Guardrails
    Path: ../AGENTS.md
---

# Documentation Production Plan

A deep plan to move @fathym/cli documentation from audit to production launch. Use this as the execution guide for closing gaps, validating examples, and locking a release-ready documentation set.

## Scope & Goals

- **Scope:** All Markdown in `docs/` plus inline JSDoc that feeds API reference generation.
- **Goals:**
  - Close documented gaps (operational runbooks, security/compliance callouts, stability matrices, downstream guidance).
  - Make every example runnable or linted in CI with clear ownership and expected outputs.
  - Prevent regressions via automated checks (frontmatter, links, snippet execution, API drift).

## Current Strengths vs. Risks

| Area | Strengths | Risks/Issues | Impact | Action Owner |
| ---- | --------- | ------------ | ------ | ------------ |
| Navigation | Index and readiness guide surface guardrails. | No doc ownership map; new topics can get orphaned. | Medium | Docs lead |
| Consistency | Frontmatter used everywhere; relative links enforced by convention. | No automated lint; risk of drift during fast changes. | High | Docs + CI |
| Guides | Getting started, building commands, scaffolding, configuration, testing, embedded CLI. | Missing troubleshooting, rollback flows, and DFS/IoC failure triage. | High | Runtime + Docs |
| Security & compliance | Patterns note env vars but lack explicit permission/redaction guidance. | Misuse of secrets or insufficient auditability. | Critical | Docs + Security |
| API reference | Structured by subsystem, backed by JSDoc. | No stability policy; examples not tied to runtime outputs. | High | Runtime + Docs |
| Examples | Cover Args/Flags, Params, IoC, intents. | Runnable status unknown; few output captures; no compliance review. | High | Docs + QA |
| Release hygiene | Readiness checklist exists. | No automated preflight (link/snippet), no downstream compatibility matrix. | High | Docs + Release |

## Workstreams & Deliverables

1. **Ownership & governance**
   - Map doc owners by area (commands, scaffolding, packaging, testing) in `docs/README.md`.
   - Add contribution/approval path in readiness guide and README audit log.
2. **Content remediation**
   - Add troubleshooting/rollback appendices to `guides/getting-started.md` and `guides/building-commands.md`.
   - Add security/compliance callout blocks to guides (env var usage, permission scopes, log redaction expectations).
   - Publish API stability policy (stable/experimental/deprecated) and compatibility matrix (CLI version ↔ Deno ↔ OS) in a dedicated section of `guides/documentation-readiness.md` or `api/README.md`.
   - Add downstream consumption guidance (install commands, pinning, migration notes) to `guides/getting-started.md`.
3. **Example accuracy & compliance**
   - Inventory all code blocks with expected outputs; tag blocks slated for execution in `deno task doc:verify`.
   - Align runnable snippets with intent tests; store expected stdout/stderr for UX-sensitive commands (logging/help).
   - Add compliance review step for examples that touch auth, DFS, or network resources; prefer mock/local fixtures.
4. **Automation & CI**
   - Implement `deno task doc:lint` for frontmatter + Markdown lint + link checking.
   - Implement `deno task doc:verify` to execute selected snippets and regenerate API docs; gate in CI.
   - Add API drift detection by re-running docs generation on CI and diffing artifacts.
5. **Release readiness**
   - Extend the launch checklist with preflight commands, required artifacts (compat matrix, changelog doc-impact), and rollback notes.
   - Require doc impact summary in release PR template and in `CHANGELOG.md` entries.

## Detailed Gap Closure Plan

| Gap | Target Doc(s) | Fix Approach | Definition of Done | Dependency |
| --- | ------------- | ------------ | ------------------ | ---------- |
| Missing troubleshooting for parser/DFS/IoC errors | `guides/getting-started.md`, `guides/building-commands.md` | Add "Troubleshooting" appendix with symptoms, causes, fixes, and command outputs. | Appendix published with at least 5 common scenarios and CLI outputs. | Runtime SMEs for error patterns |
| Security/compliance callouts | All guides with secrets/DFS/network usage | Standard callout template describing env vars, required scopes, and log redaction. | Callouts added; referenced in readiness checklist; reviewed by security. | Security reviewer |
| API stability policy | `api/README.md` (new section) | Define stable/experimental/deprecated policy, upgrade guarantees, and deprecation timeline. | Policy published; linked from readiness and index. | Maintainers |
| Compatibility matrix | New section in `guides/getting-started.md` or dedicated `guides/install.md` | Table for CLI version ↔ Deno version ↔ OS; include install commands. | Matrix published and referenced from README/index. | Release/packaging |
| Runnable snippet coverage | Quick start, logging, testing, scaffolding examples | Tag runnable snippets; add to `doc:verify`; capture expected outputs. | CI runs `doc:verify`; failures block merge; outputs documented. | QA + CI |
| Link/frontmatter lint | All Markdown | Add lint config (remark/markdownlint) and CI job. | CI fails on missing frontmatter or broken links. | CI maintainers |
| Downstream guidance | Getting started/install docs | Add installation channels, version pinning, migration notes. | Section published with commands for deno, npm, binary. | Packaging |

## Execution Timeline (suggested)

- **Week 1 (Audit + automation scaffolding):** finalize ownership map, add lint/verify tasks, start tagging runnable snippets.
- **Week 2 (Content remediation):** publish troubleshooting appendices, security/compliance callouts, and stability policy.
- **Week 3 (Validation):** wire snippets to intents, record expected outputs, run CI preflight, fill compatibility matrix.
- **Week 4 (Release prep):** finalize changelog doc impacts, confirm checklist completion, and sign off with owners.

## Example Validation Matrix

| Area | Snippet | Status | Validation Method | Output Captured | Notes |
| ---- | ------- | ------ | ----------------- | --------------- | ----- |
| Quick start | `guides/getting-started.md` greeting command | Pending | `doc:verify` + intent test | To be captured | Add stdout block after run |
| Fluent API | `concepts/fluent-api.md` Args/Flags sample | Pending | `doc:verify` + intent test | To be captured | Capture log formatting |
| Logging UX | `guides/logging-output.md` log/spinner example | Pending | `doc:verify` | To be captured | Ensure ANSI/colors preserved |
| Testing | `guides/testing-commands.md` intent suite | Pending | `doc:verify` | To be captured | Keep goldens with fixtures |
| Scaffolding | `guides/scaffolding.md` template run | Pending | `doc:verify` with temp DFS | To be captured | Use temporary workspace |

## Compliance & Safety Checks

- **Secrets:** Examples must use environment variables or mock credentials; never embed real tokens.
- **Permissions:** Note required scopes for DFS/network operations; prefer least-privilege and local fixtures.
- **Redaction:** When showing logs/output, redact paths/tokens and include a redaction note in the snippet caption.

## Metrics for Launch Readiness

- ✅ 100% Markdown with valid frontmatter and passing link lint.
- ✅ ≥80% of primary examples (quick start, logging, testing, scaffolding) are runnable and validated in CI.
- ✅ API stability policy and compatibility matrix published and linked from index/readiness.
- ✅ Release checklist executed with doc impact recorded in `CHANGELOG.md`.

## Coordination & Approvals

- **Doc owner sign-off:** Required for new/updated sections in guides/concepts.
- **Runtime owner sign-off:** Required for API/stability changes or behavior-specific outputs.
- **Security review:** Required for sections involving auth, secrets, DFS permissions, or network access.
- **Release manager sign-off:** Required before tagging a release once checklist passes.

## Next Steps

- Add runnable snippet tags and initial `doc:verify` task to the repo.
- Publish security/compliance callout templates and retrofit existing guides.
- Draft the compatibility matrix and stability policy, then link from the index and readiness guide.
