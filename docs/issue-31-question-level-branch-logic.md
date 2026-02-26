## Implementation Plan

### Data model
- Add `branchRules?: QuestionBranchRule[]` to the `Question` interface in `src/types/question.ts`
- Define a new `QuestionBranchRule` interface in `src/types/survey.ts` (or `src/types/question.ts`):
  ```ts
  export interface QuestionBranchRule {
    id: string
    optionId: string          // the choice option that triggers this jump
    targetQuestionId: string  // the question to jump to (skipping all questions in between)
  }
  ```
- Only `type === 'choice'` questions support question-level branch rules (condition is always answer-based)
- Update `normalizeSurvey()` in `src/lib/normalize.ts` to default `branchRules` to `[]` on each question

### Store actions
- Add `addQuestionBranchRule(questionId: string, rule: Omit<QuestionBranchRule, 'id'>): void` to `builderStore.ts`
- Add `removeQuestionBranchRule(questionId: string, ruleId: string): void` to `builderStore.ts`
- Both actions use `updateQuestion` internally to keep the question's `branchRules` array updated and mark `isDirty`

### New QuestionBranchEditor component
- Create `src/components/builder/QuestionBranchEditor.tsx` (mirrors the portal pattern of `BranchRuleEditor.tsx`)
- Props: `question: Question`, `onClose: () => void`
- Show a list of active question-level rules (optionId → targetQuestionId displayed as human-readable labels)
- "Add rule" form:
  - A `<select>` to pick the triggering answer option (from `question.options`)
  - A `<select>` to pick the target question (from all questions in the survey, excluding the current question and any questions that would create a backward reference)
- Delete button on each rule row
- Renders via `createPortal(…, document.body)` to avoid CSS containing-block issues from Framer Motion transforms

### Builder UI — QuestionCard integration
- In `QuestionCard.tsx`, add a `GitBranch` button to the bottom toolbar
  - Only shown when `question.type === 'choice'` (branch conditions require an answer option)
  - Show a small orange badge with the rule count when `question.branchRules?.length > 0`
  - On click, set state to open `QuestionBranchEditor` for this question
- Lift the open-editor state to `BuilderCanvas.tsx` (same pattern used for section-level `BranchRuleEditor`) so the dialog is rendered outside all DnD / transform contexts

### Responder logic
- In `src/components/responder/SurveyPlayer.tsx`, after the respondent confirms their answer to a question:
  1. Check if the current question has `branchRules` (and `type === 'choice'`)
  2. Look for the first rule whose `optionId` is in the respondent's selected answers
  3. If found, advance directly to `targetQuestionId` (skip all questions between current position and the target)
  4. If no rule matches, fall back to normal sequential question flow
- Ensure the question-level jump is applied before the section-level branch rules so question skipping takes precedence within a section

### Files affected
`src/types/question.ts`, `src/types/survey.ts`, `src/lib/normalize.ts`, `src/stores/builderStore.ts`, `src/components/builder/QuestionCard.tsx`, `src/components/builder/BuilderCanvas.tsx`, `src/components/builder/QuestionBranchEditor.tsx` (new), `src/components/responder/SurveyPlayer.tsx`, `src/i18n/en.json`, `src/i18n/ko.json`
