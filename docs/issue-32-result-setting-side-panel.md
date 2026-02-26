## Implementation Plan

### Data model
- Extend `ResultConfig` in `src/types/survey.ts` with two new optional boolean flags:
  - `hideResults?: boolean` — if `true`, the result screen is not shown to respondents at all
  - `hideScore?: boolean`  — if `true`, the result screen is shown but the numerical score is suppressed
- Add `scoringDisabled?: boolean` to the `Survey` interface (top-level field, not inside `ResultConfig`)
  - When `true`, all point-input fields are hidden from the builder and scores are not calculated
- Update `normalizeSurvey()` in `src/lib/normalize.ts` to default all three new flags to `false`
- Add `'scoringDisabled'` to the `updateMeta` pick list in `src/stores/builderStore.ts`

### New ResultSettingEditor component
- Create `src/components/builder/ResultSettingEditor.tsx`
- **General result screen** section (reads/writes `draft.resultConfig` and `draft.scoringDisabled`):
  - `scoringDisabled` toggle — *"Disable scoring"* (hides all point fields from the builder; score ranges and showScore toggle are also hidden when this is on)
  - `hideResults` toggle — *"Hide result screen from respondents"*
  - `hideScore` toggle — *"Hide numerical score"* (only enabled when `hideResults` is `false`)
  - When `!scoringDisabled`, embed `<ResultConfigEditor config={draft.resultConfig} onChange={...} />` for the survey-level score ranges
- **Per-section result screens** section:
  - Iterate `draft.sectionOrder` and for each section render a collapsible row showing the section title and its `<ResultConfigEditor>` with the section-level `resultConfig`
  - This gives the author one place to view and edit all section result configs without opening each `SectionCard` individually
  - Call `updateSection(sectionId, { resultConfig: cfg })` on change

### Builder UI — sidebar panel
- In `BuilderSidebar.tsx`, add a `'result'` entry to the `PANELS` array using the `BarChart2` icon
- Add `result: <ResultSettingEditor />` to the `CONTENT` map
- Add i18n keys: `builder.resultSettings.title` (EN: `"Result Settings"`, KO: `"결과 설정"`) in `en.json` and `ko.json`
- Optionally retain the per-section `BarChart2` shortcut button in `SectionCard.tsx` as a convenience; if removed, update the section-card header to remove dead UI

### Builder UI — conditional points fields
When `draft.scoringDisabled === true`, visually suppress all scoring UI in the builder:
- In `ChoiceEditor.tsx`: hide the per-option `pts` `<Input>` and the `pts` label
- In `ScaleEditor.tsx`: hide the *"Use scale value as points"* `<Switch>` block
- In `ResultConfigEditor.tsx`: hide the `showScore` toggle and the entire score-ranges section (since scores are disabled)
Pass `scoringDisabled` down via props or read it directly from `useBuilderStore`

### Responder / result screen
- In `src/components/responder/ResultScreen.tsx`, respect the new flags from the survey's `resultConfig`:
  - If `survey.scoringDisabled === true` or `survey.resultConfig.hideResults === true`, render only the thank-you message without any score or range content
  - If `survey.resultConfig.hideScore === true` (and `hideResults` is `false`), render the range message and image but suppress the numeric score line
- In `src/pages/SurveyResponderPage.tsx`, when `scoringDisabled` is `true`, pass `totalScore: 0` (or skip score calculation) to avoid computing a meaningless value

### Files affected
`src/types/survey.ts`, `src/lib/normalize.ts`, `src/stores/builderStore.ts`, `src/components/builder/BuilderSidebar.tsx`, `src/components/builder/ResultSettingEditor.tsx` (new), `src/components/builder/editors/ChoiceEditor.tsx`, `src/components/builder/editors/ScaleEditor.tsx`, `src/components/builder/ResultConfigEditor.tsx`, `src/components/builder/SectionCard.tsx`, `src/components/responder/ResultScreen.tsx`, `src/pages/SurveyResponderPage.tsx`, `src/i18n/en.json`, `src/i18n/ko.json`
