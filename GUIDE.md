---
FrontmatterVersion: 1
DocumentType: Guide
Title: Command-Line Interface Guide
Summary: Playbook for shaping and maintaining the Fathym command-line interface.
Created: 2025-11-20
Updated: 2025-11-20
Owners:
  - fathym
References:
  - Label: Project README
    Path: ./README.md
  - Label: Project Agents Guide
    Path: ./AGENTS.md
  - Label: Projects: Ref-Arch README
    Path: ../README.md
  - Label: Projects: Ref-Arch Guide
    Path: ../GUIDE.md
  - Label: Root Workspace Guide
    Path: ../../../WORKSPACE_GUIDE.md
---

# Command-Line Interface Guide

Use this playbook to keep Fathym CLI work predictable and discoverable.

## Current Focus

- Define initial command surface (project scaffolding, env bootstrap, dev
  server helpers, deploy/publish workflows).
- Choose packaging/distribution approach (Deno task, npm, binary) and document
  how users install and update.
- Identify dependencies on `@fathym/common` and other ref-arch libraries to
  keep APIs consistent.

## Workflow

1. **Align scope** in [`README.md`](./README.md): clarify intended change
   (feature, fix, release prep) and note target implementation repo/branch.
2. **Design commands**: document command/flag shapes in `docs/` (create if
   needed) with frontmatter and link to upstream assumptions.
3. **Capture provenance**: once distribution is chosen, record upstream source,
   version pins, and release channels in `UPSTREAM.md`.
4. **Validate behavior**: add/update smoke tests or scripts for critical CLI
   flows (scaffold, run, deploy); keep usage examples current.
5. **Communicate breaking changes**: add migration notes and notify consumers
   (micro-apps/services) before altering command/flag behavior.

## Verification

- Ensure links are relative and references keep parent guides discoverable.
- Update the roster in `../README.md` when status or entry docs change and link
  related pods (e.g., reference architecture) when dependencies shift.
- When workspace tasks exist, also run: `deno task prompts:verify-frontmatter`,
  `deno task link:verify`, `deno task workspace:check`.
