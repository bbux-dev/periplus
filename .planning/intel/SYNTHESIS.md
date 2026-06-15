# Synthesis Summary

Entry point for `gsd-roadmapper`. Mode: new (net-new bootstrap).

## Doc counts by type
- SPEC: 2
- ADR: 0
- PRD: 0
- DOC: 0
- UNKNOWN/low-confidence: 0

Sources:
- /home/bbux/git/life-log/spec.md — "Prototype Spec: Personal Life Log PWA" (SPEC, high confidence, not locked)
- /home/bbux/git/life-log/docs/architecture-template.md — "SPEC: Frontend Architecture Template (Life Log PWA)" (SPEC, high confidence, not locked)

## Cross-ref graph
- architecture-template.md → spec.md
- spec.md → (none)
- Cycle detection: PASS (acyclic, max depth 1, well under cap of 50)

## Decisions locked
- 0 (no ADRs in ingest set)

## Requirements extracted
- 0 formal requirements (no PRDs). Product requirements live inside spec.md and are captured as constraints (data model, capture flow, screens, acceptance criteria). Roadmapper should derive REQ-* IDs from intel/constraints.md.

## Constraints
- Total: 14 constraint entries in intel/constraints.md
- By type:
  - schema: 2 (LifeLogEntry data model, IndexedDB object stores)
  - nfr: 5 (PWA/offline reqs, product acceptance criteria, non-goals, frontend stack pin, architecture acceptance criteria)
  - protocol: 7 (capture flow, URL metadata extraction, screens/navigation, directory layout, conventions, deviations-from-patrimonium)
  - api-contract: 0 (no backend — spec.md mandates none)

## Context topics
- 0 (no DOC-type sources)

## Authoritativeness note
- spec.md is authoritative on product / UX / data-model.
- docs/architecture-template.md is authoritative on code structure; it explicitly defers to spec.md on product scope and lists its deviations as required-by-spec.md.
- The two are non-contradictory by design.

## Conflicts
- Blockers: 0
- Competing variants: 0
- Auto-resolved: 0
- Info: 1 (two non-contradictory SPECs merged)
- Detail: /home/bbux/git/life-log/.planning/INGEST-CONFLICTS.md

## Intel files
- /home/bbux/git/life-log/.planning/intel/constraints.md (SPEC constraints — primary)
- (no decisions.md, requirements.md, or context.md — no ADR/PRD/DOC sources)

## Status
READY — no blockers, no competing variants. Safe to route to gsd-roadmapper.
