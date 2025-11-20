---
FrontmatterVersion: 1
DocumentType: Guide
Title: Command-Line Interface Agents Guide
Summary: Guardrails for collaborating on the Fathym command-line interface pod.
Created: 2025-11-20
Updated: 2025-11-20
Owners:
  - fathym
References:
  - Label: Project README
    Path: ./README.md
  - Label: Project Guide
    Path: ./GUIDE.md
  - Label: Projects: Ref-Arch README
    Path: ../README.md
  - Label: Projects: Ref-Arch AGENTS
    Path: ../AGENTS.md
  - Label: Projects: Ref-Arch Guide
    Path: ../GUIDE.md
  - Label: Root README
    Path: ../../../README.md
  - Label: Root Agents Guide
    Path: ../../../AGENTS.md
  - Label: Root Workspace Guide
    Path: ../../../WORKSPACE_GUIDE.md
---

# AGENTS: Command-Line Interface

Guardrails for humans and AI collaborating on the Fathym CLI pod.

## Core Guardrails

1. **Stay scoped.** Keep CLI work inside
   `projects/ref-arch/command-line-interface/` unless coordinating with another
   pod; link cross-pod work clearly.
2. **Frontmatter required.** Every Markdown doc uses frontmatter and
   document-relative references up to parent guides.
3. **Provenance and packaging.** Capture upstream sources, distribution channel
   (npm/deno/binary), and version pins in `UPSTREAM.md`; prefer upstream-first
   fixes before diverging.
4. **Command stability.** Avoid breaking CLI flags/commands silently; document
   breaking changes and add migration notes for known consumers.
5. **Secure defaults.** Keep auth/secrets out of docs; prefer env vars or local
   profiles and note any required permissions explicitly.

## Communication

- Declare intent before editing; summarize outcomes and next steps in the
  project README or a small log.
- Cross-link to upstream repos/branches and to dependent pods (e.g., reference
  architecture, micro-apps) when changes impact them.
