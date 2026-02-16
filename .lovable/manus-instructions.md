# Manus Agent Instructions: Research + Author High-Accuracy CRx Topics

## Goal
Create or update `public/topics/<slug>.json` files for CRx Navigator so they are clinically accurate, usable in a 10-minute GP consultation workflow, and pass all repository quality gates.

## Critical Constraints (Do Not Violate)
1. No PHI. Do not include real patient data, case notes, identifiers, or copied clinical records.
2. Schema version must be `2.1`.
3. Topic must be usable in fast primary-care workflow (history -> exam -> assessment -> plan -> safety net).
4. Clinical safety first: red flags, must-not-miss conditions, escalation logic must be explicit.
5. `qa.status` must remain `draft` until clinical reviewer approval is obtained.

## Source Quality Standard (Target: 10/10)
Use a two-layer evidence model:
1. Primary authoritative guidance (required): NICE/CKS/BNF/BMJ Best Practice (or equivalent national guideline).
2. Secondary support (optional): specialty society guidance, peer-reviewed summaries.

Rules:
1. Any high-stakes claim (red flags, escalation thresholds, medication decision logic, safety-net advice) must be traceable to at least 1 authoritative source.
2. If sources conflict, prefer most current national guideline and document decision rationale in research notes.
3. Avoid unsupported numeric thresholds or dosing details; if uncertain, omit exact numbers rather than guess.

## Required Working Artifacts (Create During Research)
For each topic, produce these artifacts before final JSON:
1. `Research brief`:
- scope of condition
- key decision points in GP consult
- exclusion boundaries (what is out of scope)
2. `Evidence table`:
- claim
- source URL/title
- publication/update date
- confidence (high/medium/low)
3. `Content map` to schema:
- each schema section mapped to evidence-backed content

Note: These artifacts can be temporary working docs; only final JSON is committed unless requested.

## Repository Contract You Must Satisfy
### Types and schema references
- `src/types/topic.ts`
- `src/lib/topicSchema.ts`
- `scripts/topics-validate.mjs`
- `schemas/topic.v2.1.json`

### Mandatory root keys in topic JSON
- `version`, `metadata`, `snippets`, `reasoning`, `structuredFields`, `outputTemplate`, `review`, `jitl`, `ddx`, `qa`

### Mandatory completeness checks (hard-fail)
- `review.historyPrompts.length >= 1`
- `review.examSections.length >= 1`
- `review.investigations.whenHelpful.length >= 1`
- `review.managementConsiderations.followUpLogic.length >= 1`

## Authoring Rules by Section

### 1) metadata
Required:
- `id`, `slug`, `displayName`, `specialty`, `triggers`

Rules:
1. Keep `slug` lowercase, hyphenated, stable.
2. Triggers should be memorable and clinically intuitive.
3. `displayName` should match clinician language used in consultations.

### 2) snippets
Purpose: accelerate note drafting without sacrificing safety.

Target shape:
1. 6-12 snippets total.
2. Cover: history, exam, assessment, plan, safety-netting.
3. Use token syntax supported by app:
- choice token: `{yes|no*|unknown}` (`*` = default)
- variable token: `[Duration]`
- date token: `@date(+7d)` (supports `d`, `w`, `m` offsets)

Quality rules:
1. Snippet text should be clinically realistic and editable.
2. Avoid rigid or over-specific treatment claims unless strongly sourced.
3. Include at least one explicit safety-net snippet.

### 3) reasoning
Must include:
- `discriminators`
- `mustNotMiss`
- `redFlags`
- `references` (label + URL)

Quality rules:
1. `redFlags` must be observable/actionable findings.
2. `mustNotMiss` should represent true high-risk alternatives.
3. `discriminators` should help clinicians separate common vs serious causes quickly.
4. `references` should point to source pages actually used.

### 4) structuredFields
Recommended default sections for consultation speed:
- `history`
- `exam`
- `assessment`
- `plan`
- `safety-net`

Rules:
1. Use field types supported by app (`text`, `textarea`, `number`, `select`, `multi`, `toggle`, `date`).
2. Use `showIf` only with supported operators: `==`, `!=`, `contains`, `&&`, `||`.
3. Keep cognitive load low: concise labels and sensible defaults.

### 5) outputTemplate
Must include section list suitable for final export.

Rules:
1. Include `editor` plus structured sections.
2. Include `reasoning` section (usually not default for patient-facing summary unless needed).
3. Include DDx output section:
- `{ "id": "ddx-assessment", "title": "Working Differential", "source": "ddx", "includeByDefault": true }`

### 6) review (high-value section, no placeholders)
Required sub-sections:
- `illnessScript`
- `mustNotMiss`
- `discriminators`
- `historyPrompts`
- `examSections`
- `diagnoses` (`common`, `mustNotMiss`, `oftenMissed`)
- `investigations`
- `managementConsiderations`
- `safetyNetting`
- optional `mindset`

Quality rules:
1. No empty critical arrays where clinical guidance should exist.
2. Avoid boilerplate repeated text across every item.
3. `mustNotMiss` items must include concrete `whyDangerous` and `escalationConcern`.
4. `safetyNetting.returnAdvice` should be patient-facing; `escalationTriggers` clinician-facing.

### 7) jitl
Required:
- `termMap` (can be empty)
- `linkProviders` (must be non-empty for useful workflow)

Rules:
1. Prefer trusted provider links (NICE/CKS/BNF/BMJ + general fallback).
2. Add specific `termMap` entries for ambiguous or high-yield terms.

### 8) ddx
Required:
- `evidencePrompts` (non-empty recommended)
- `compareEnabled` (boolean)

Rules:
1. `evidencePrompts` should align with discriminators/history/exam prompts.
2. Enable compare unless there is a clear reason not to.

### 9) qa
For authored drafts:
- `status: "draft"`
- `clinicalReviewer: "unassigned"` (or assigned name if known)
- `reviewedAt: "1970-01-01"` (or real review date only after review)
- `version: "0.0.0"` for new drafts

After clinician sign-off, update qa fields accordingly.

## 10/10 Quality Rubric (Self-score before handoff)
Score each 0/1. Ship only at 9-10.
1. High-stakes claims are source-backed.
2. Red flags are actionable and unambiguous.
3. Must-not-miss conditions are truly safety-critical.
4. Snippets are concise and workflow-optimized.
5. Structured fields support quick completion.
6. Review section is complete and non-generic.
7. DDx prompts reflect real discriminators.
8. Safety-netting is explicit and practical.
9. Topic passes all repo validation/build checks.
10. JSON is coherent, consistent, and free of placeholder filler.

## Validation + Build Workflow (Must Run)
From repo root:
1. `npm run topics:validate`
2. `npm run topics:build`
3. `npm run test`

Expected outcomes:
1. No topic validation errors.
2. QA report prints topic completeness; no unapproved topics if preparing release set.
3. Test suite remains green.

## Authoring Procedure (Step-by-step)
1. Pick condition and define scope (primary care presentation + exclusions).
2. Build evidence table from authoritative sources.
3. Draft topic JSON in `2.1` format.
4. Populate snippets and structured fields for 10-minute consult speed.
5. Build robust review and safety-net content (no empty critical sections).
6. Ensure DDx prompts and compare behavior are configured.
7. Set QA block to draft unless formally reviewed.
8. Run validation/build/tests.
9. Fix all issues, then handoff with a short summary:
- what changed
- evidence highlights
- open clinical questions (if any)

## Non-acceptable Output (Reject and rework)
1. Generic filler statements repeated across items.
2. Empty review arrays in required clinical sections.
3. Unsupported medication specifics or fabricated thresholds.
4. Missing references for safety-critical content.
5. Failing `topics:validate` or `topics:build`.

## Handoff Template (Use in PR/summary)
1. Topic: `<displayName>` (`<slug>`)
2. Sources reviewed: `<list>`
3. Major clinical decisions encoded: `<bullets>`
4. Validation results:
- `topics:validate`: pass/fail
- `topics:build`: pass/fail
- `test`: pass/fail
5. QA status set to: `draft/approved`
6. Residual risks or reviewer questions: `<if any>`

## Runtime UX and Documentation Guardrails
1. Editor inserts must remain clinician-clean:
- Never render internal tracking markers (for example `[CRx linked: ...]`) in visible note content.
- Internal link/sync tracking must be stored in app state, not clinician-facing text.
2. Clinical output exports must remain clean:
- Copy and Download outputs must not include internal metadata.
3. Differential/review interactions should be one-click:
- Review section expand/collapse must toggle on first click.
4. Output preview must be user-resizable:
- Desktop editor/preview split should expose a draggable divider and persist pane sizes in UI prefs.
5. Keep consultation documentation professional:
- No system-only identifiers, timestamps, or tracking tags in note body.
