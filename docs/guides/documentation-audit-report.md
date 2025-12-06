---
FrontmatterVersion: 1
DocumentType: Report
Title: Documentation Audit Report
Summary: Deep audit of @fathym/cli docs with coverage, accuracy checks, and production-readiness actions.
Created: 2025-12-02
Updated: 2025-12-02
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Readiness Checklist
    Path: ./documentation-readiness.md
  - Label: Production Plan
    Path: ./documentation-production-plan.md
---

# Documentation Audit Report

This report moves beyond planning to inventory current documentation, score accuracy, and prioritize fixes needed to ship production-grade docs for `@fathym/cli`.

## Scope & Method

- **Sources reviewed:** All Markdown in `docs/` (guides, concepts, API), top-level `README.md`/`README.logging.md`, `examples/`, and test fixtures in `tests/`/`test-cli/`.
- **Checks applied:** Frontmatter presence, content coverage against runtime surface (`src/` modules), example completeness (inputs + outputs), security/compliance callouts, and alignment with the production plan deliverables.
- **Status labels:** ✅ complete, 🟡 needs depth/verification, 🔴 missing or inaccurate.

## Executive Summary

- **Strengths:** Consistent frontmatter across docs; solid coverage for fluent command building, intents testing, logging/styling, and scaffolding walkthroughs.
- **Critical gaps:** No install/channel matrix (deno/npm/binary), no compatibility policy, minimal troubleshooting/rollback flows, and no documented outputs or compliance review for examples.
- **Verification gaps:** Code blocks are instructional but mostly unvalidated; no CI task or recorded expected results to guarantee accuracy.

## Coverage by Area

| Area / File | Status | Observations | Actions |
| --- | --- | --- | --- |
| **Onboarding:** `docs/guides/getting-started.md` | 🟡 | Clear project setup and first command walkthrough; lacks install channel matrix, troubleshooting, and upgrade/migration guidance. | Add install table (deno, npm, binary), include `deno task` wiring, and append troubleshooting/rollback steps for parser/IoC errors. |
| **Command authoring:** `docs/guides/building-commands.md` | 🟡 | Explains builder patterns and Params; no error handling, schema failure examples, or DFS/IoC failure modes. | Add validation failure examples with outputs; include DFS/IoC recovery steps and logging expectations. |
| **Testing:** `docs/guides/testing-commands.md` | 🟡 | Shows `CommandIntents` usage with `.Build()` reminder; lacks CI task linkage and examples of snapshot/output expectations. | Add `deno task test` + `doc:verify` linkage and sample `ExpectLogs`/`ExpectExit` outputs captured from real runs. |
| **Logging/Output:** `docs/guides/logging-output.md` & `docs/api/logging.md`/`styling.md`/`spinners.md` | 🟡 | Describes APIs but no before/after screenshots or sample outputs; spinner states not illustrated. | Capture output snippets/screens, document spinner lifecycle (start/stop/fail), and include redaction rules for secrets. |
| **Infrastructure:** `docs/guides/advanced-infrastructure.md` | 🟡 | High-level IoC/DFS notes; no resilience guidance or rollback paths. | Add failure scenarios (missing DFS contexts, IoC resolution errors) with mitigations. |
| **Configuration:** `docs/guides/cli-configuration.md` | 🟡 | Documents `.cli.json` and `.cli.init.ts` structure; missing example IoC registrations and validation rules. | Provide sample init functions, schema validation guardrails, and permission notes. |
| **Scaffolding:** `docs/guides/scaffolding.md` & `docs/api/templates.md` | 🟡 | Covers template locators; lacks runnable example showing generated file tree and template variables. | Add runnable scaffold example with expected tree and template variable table. |
| **Concepts:** `docs/concepts/*.md` | ✅/🟡 | Architecture/commands/fluent/context are described; stability/support tiers absent. | Add stability policy callouts linking to API sections. |
| **API Reference:** `docs/api/*.md` | 🟡 | Coverage by subsystem present; no stability/deprecation markers or version support matrix. | Add stable/experimental tags per surface and compatibility matrix. |
| **Examples:** `examples/` directory | 🟡 | Provides sample commands/config; no stated inputs/outputs or compliance review. | Add README per example with inputs, expected outputs, and safe usage (no secrets/network). |
| **Tests/fixtures:** `tests/`, `test-cli/` | 🟡 | Intent suites exist but not referenced from docs; no mapping from guides to test cases for validation. | Map runnable snippets to intents; reference tests from guides for provenance. |
| **Project README:** `README.md`, `README.logging.md` | 🟡 | Audit log exists but lacks per-area owners and execution progress for docs remediation. | Add owner map and progress tracker linked to this report. |

## Example Accuracy & Usability

- **Untested snippets:** Most guide/API code blocks (e.g., quick start command definitions, testing intents) are not tagged for execution and have no expected stdout/stderr records.
- **Input/output gaps:** Logging and spinner guides show API calls without resulting output samples; scaffolding guide lacks generated tree verification.
- **Compliance:** No redaction guidance for logs or notes on avoiding real secrets/network calls in examples; install steps rely on `@latest` with no pinning guidance.

### Immediate Verification Targets

1. **Command lifecycle snippets** in `docs/guides/getting-started.md` and `docs/guides/building-commands.md` — add inputs/outputs and run via `doc:verify`.
2. **Intent testing examples** in `docs/guides/testing-commands.md` — capture `ExpectLogs`/`ExpectExit` outputs and link to the matching intent files under `tests/intents/`.
3. **Logging/styling/spinner examples** — record sanitized output and ANSI styling expectations.
4. **Scaffolding walkthrough** — run a template scaffold and publish the generated tree plus template variable resolution.

## Compliance & Reliability Findings

- **Secrets & permissions:** Guides reference env vars and DFS usage but do not specify required permissions or redaction rules; add explicit callouts per guide.
- **Versioning:** No documented compatibility between CLI versions, Deno versions, and OS targets; no stability/deprecation labels in API docs.
- **Rollbacks:** No documented rollback paths for failed installs or command execution regressions.

## Next Actions (execution-ready)

- Create `doc:lint` and `doc:verify` tasks to enforce frontmatter, link integrity, and runnable snippets; wire into CI before launch.
- Author install/compatibility matrices and stability policy, then reference from `docs/README.md`, onboarding guides, and API sections.
- Embed troubleshooting and rollback appendices in onboarding and command authoring guides with real command outputs.
- Add example READMEs with inputs/outputs/compliance notes under `examples/`, and link relevant intent tests from guides.
- Update project README to track owner assignments and remediation progress tied to this report.
