---
FrontmatterVersion: 1
DocumentType: Guide
Title: Documentation Readiness & Launch Checklist
Summary: Audit log, coverage map, and production checklist for @fathym/cli documentation.
Created: 2025-11-30
Updated: 2025-12-01
Owners:
  - fathym-platform
References:
  - Label: Documentation Index
    Path: ../README.md
  - Label: Project Guide
    Path: ../GUIDE.md
  - Label: AI Collaboration Guardrails
    Path: ../AGENTS.md
---

# Documentation Readiness & Launch Checklist

This guide captures the audit, plan, and checkpoints required to ship @fathym/cli docs to production quality.

## Objectives

- Guarantee every public surface area has a discoverable, up-to-date doc with working examples.
- Keep Markdown consistent: required frontmatter, scoped references, and contributor guardrails.
- Make launch readiness measurable through checklists that are easy to maintain release-over-release.
- Tie audits to execution by pairing this checklist with the companion [Documentation Production Plan](./documentation-production-plan.md).

## Inventory & Coverage Map

| Area | Primary Docs | Coverage Status | Notes |
| ---- | ------------ | --------------- | ----- |
| Quick start & command authoring | `guides/getting-started.md`, `guides/building-commands.md` | ✅ Complete | Flows through first run, schema definition, and execution.
| Concepts & architecture | `concepts/architecture.md`, `concepts/context.md`, `concepts/commands.md`, `concepts/fluent-api.md` | ✅ Complete | Describes runtime flow, context, and builder patterns with diagrams.
| API reference | `api/cli.md`, `api/commands.md`, `api/fluent.md`, `api/dfs.md`, `api/templates.md`, `api/testing.md`, `api/utilities.md` | ⚠️ Keep current | Ensure new exports add JSDoc and API entries; re-run after public changes.
| Configuration | `guides/cli-configuration.md` | ✅ Complete | Documents `.cli.json` and `.cli.init.ts` with validation notes.
| Scaffolding & templates | `guides/scaffolding.md` | ✅ Complete | Walks through template locators and scaffolder behavior.
| Logging & UX | `guides/logging-output.md` | ⚠️ Review for UX | Add output samples when console UX changes.
| Packaging & embedding | `guides/embedded-cli.md` | ✅ Complete | Covers compiler pipeline and embedded template usage.
| Testing | `guides/testing-commands.md`, `api/testing.md` | ✅ Complete | Intent-based testing workflow and API reference aligned.

## Audit Findings

- **Navigation gaps resolved:** The documentation index now links directly to readiness guidance, and the component map highlights where documentation guardrails live.
- **Frontmatter compliance:** All Markdown in `docs/` already includes frontmatter; keep that invariant for future additions.
- **API drift risk:** When adding or modifying exports, update inline JSDoc and regenerate the API reference pages to avoid stale descriptions.

## Strengths vs. Gaps

| Area | What is solid | Needs improvement | Not covered / missing |
| ---- | ------------- | ----------------- | --------------------- |
| Navigation & guardrails | Index links to readiness guide; component map surfaces doc guardrails. | Add doc ownership map by domain (commands, scaffolding, packaging) so contributors know who to ping. | N/A |
| Frontmatter & consistency | All Markdown uses frontmatter with references; docs follow relative linking. | Add automated lint (CI check) to reject missing/incorrect frontmatter. | N/A |
| Guides & concepts | Core flows (getting started, building commands, scaffolding, config, testing) are documented end-to-end. | Expand operational guidance (rollbacks, troubleshooting common CLI errors, DFS connectivity issues). | Dedicated security/compliance guardrails per command are not documented. |
| API reference | Structured per subsystem with schema descriptions. | Ensure each public export has examples and notes on breaking behavior; regenerate after API changes. | No stability policy table (LTS vs. experimental) for APIs. |
| Examples | Patterns show Args/Flags, Params, IoC usage, and intent testing. | Add runnable snippets tied to tests and include rendered output for UX-sensitive commands (logging/help). | No tracked status for which snippets are auto-validated. |
| Release readiness | Launch checklist exists and links to index. | Add pre-release doc smoke test (link checker, snippet execution) before tagging. | No downstream consumption guidance (version pins, compatibility matrix). |

### Gap Remediation Actions

- **Operational runbooks:** Add a troubleshooting appendix to `guides/getting-started.md` and `guides/building-commands.md` covering common parser errors, DFS resolution failures, and IoC misconfiguration.
- **Security & compliance callouts:** Add standardized callout blocks to guides describing how to pass credentials via environment variables, permission scopes required for DFS/network, and redaction expectations for logs.
- **API stability policy:** Introduce an "API stability" section in `docs/api/README.md` (or a new short page) explaining stable vs. experimental exports and deprecation flow.
- **Snippet validation:** Create a `deno task doc:verify` that runs key snippets (quick start, logging output, testing intents) and integrate into CI to keep examples executable.
- **Link and frontmatter linting:** Add a docs lint task (e.g., remark/markdownlint) that enforces frontmatter presence and relative links; wire into CI alongside unit tests.
- **Downstream guidance:** Add a compatibility matrix (CLI version ↔ required Deno version ↔ supported OS) and recommended installation commands (deno install, npm, binary) to `docs/guides/getting-started.md` or a new "install" page.

## Production Launch Checklist

Use this checklist for every release candidate:

1. **Scope review**
   - [ ] Confirm new commands/flags/config keys are documented in the relevant guide and API page.
   - [ ] Verify examples run against the current `deno task test` baseline when applicable.
2. **Quality bar**
   - [ ] Frontmatter present and current (`Updated` field refreshed).
   - [ ] Links are relative and valid within `docs/`.
   - [ ] Include safety callouts for auth/secret handling and backward-compatibility notes for breaking changes.
3. **Publishing**
   - [ ] Update `docs/README.md` quick links if new topics are introduced.
   - [ ] Capture release notes in `CHANGELOG.md` with doc-impact summary.
   - [ ] If examples embed code snippets, ensure lint/formatting matches repository standards.

## Contribution Workflow

- **Before editing:** Declare intent in the project README or a scoped log and identify which docs you will touch.
- **While editing:** Keep doc scope tight—prefer updating the existing guide over creating parallel narratives.
- **After editing:** Note outcomes and next steps in `README.md` (top-level) and mark completed checklist items for the release.

## Open Follow-Ups

- Add rendered output examples to `guides/logging-output.md` the next time CLI UX changes.
- Re-run API reference generation after any public surface change to keep `docs/api/*.md` aligned with the source.
- Add operational runbooks (troubleshooting, rollback patterns) and a security/compliance callout template to the guides.
- Wire snippet verification and link/frontmatter linting into CI before the next release candidate.
- Publish an API stability and compatibility matrix so consumers know upgrade expectations.

## Example Accuracy & Usability Audit

| Example set | Current status | Actions for production readiness |
| ----------- | -------------- | -------------------------------- |
| Quick start (`guides/getting-started.md`) | Aligned with current builder APIs but not auto-verified. | Add to `deno task doc:verify` to compile and run the greeting command; ensure install instructions match release channel (deno install/JSR). |
| Fluent patterns (`guides/building-commands.md`, `concepts/fluent-api.md`) | Patterns match exported builders; lacks runtime output captures. | Capture expected console output for at least one command (Args/Flags) and tie to intent tests for drift detection. |
| Logging and help UX (`guides/logging-output.md`, `help/CLIHelpBuilder` snippets) | API usage is correct; rendered output not shown. | Add screenshots/text blocks of log/help output and refresh when iconography or coloring changes. |
| Testing (`guides/testing-commands.md`, `api/testing.md`) | Intents align with current `CommandIntents` API. | Keep a golden intent test in CI to validate documentation snippets; document failure triage steps. |
| Templates (`guides/scaffolding.md`) | Locator APIs and scaffolder usage are up to date. | Add a minimal template example to CI verification to ensure embedded and DFS locators still work across releases. |
