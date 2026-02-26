## Implementation Plan

### Data model
- Add `indexFormat?: 'none' | 'numeric' | 'alpha-lower' | 'alpha-upper'` to the `Survey` interface in `src/types/survey.ts`
- Update `normalizeSurvey()` in `src/lib/normalize.ts` to default `indexFormat` to `'none'` when not set
- Add `'indexFormat'` to the `updateMeta` pick list in `src/stores/builderStore.ts`

### New FormatControlEditor component
- Create `src/components/builder/FormatControlEditor.tsx`
- Render a segmented control (or set of radio buttons) for the four modes:
  - **None** — no prefix shown
  - **1 2 3** (numeric) — sections become "1.", questions become "2.", options become "3." (all items share a single sequential counter)
  - **a b c** (alpha lower) — same sequential numbering using lowercase letters: "a.", "b.", "c.", …
  - **A B C** (alpha upper) — same sequential numbering using uppercase letters: "A.", "B.", "C.", …
- Show a small live-preview line beneath the control (e.g. `"A. Section title / B. Question text / C. Option"`)
- On change call `updateMeta({ indexFormat: value })`

### Builder UI — sidebar panel
- In `BuilderSidebar.tsx`, add a new `'format'` entry to the `PANELS` array using the `Hash` icon from `lucide-react`
- Add `format: <FormatControlEditor />` to the `CONTENT` map
- Add i18n keys: `builder.format.title` (EN: `"Format"`, KO: `"형식"`) in both `en.json` and `ko.json`

### Displaying indices in the canvas
- Add a `getIndexLabel(index: number, format: Survey['indexFormat']): string` helper in `src/lib/utils.ts` that converts a 0-based index to the appropriate prefix string
  - `numeric` → `"1."`, `"2."`, …
  - `alpha-lower` → `"a."`, `"b."`, …
  - `alpha-upper` → `"A."`, `"B."`, …
  - `none` → `""`
- In `SectionCard.tsx`: read `draft.indexFormat` from the store and prepend `getIndexLabel(sectionIndex, indexFormat)` before the section title input (as a non-editable inline span)
- In `QuestionCard.tsx`: similarly prepend the question's sequential index label (using the same format as sections; the counter resets at each section or runs globally depending on the desired UX — the simplest implementation is per-section sequential)
- In `ChoiceEditor.tsx`: prepend each option row with its option index label (using the same `indexFormat`, sequentially numbered within each question)

### Files affected
`src/types/survey.ts`, `src/lib/normalize.ts`, `src/stores/builderStore.ts`, `src/lib/utils.ts`, `src/components/builder/BuilderSidebar.tsx`, `src/components/builder/FormatControlEditor.tsx` (new), `src/components/builder/SectionCard.tsx`, `src/components/builder/QuestionCard.tsx`, `src/components/builder/editors/ChoiceEditor.tsx`, `src/i18n/en.json`, `src/i18n/ko.json`
