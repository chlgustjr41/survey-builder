## Implementation Plan

### i18n audit — hardcoded strings to migrate

Several components render English text as string literals without `t()` calls. Each string needs:
1. A new key added to `src/i18n/en.json` with the English value
2. The matching Korean translation added to `src/i18n/ko.json`
3. The hardcoded literal replaced with `t('...')` in the component

**`src/components/builder/BuilderSidebar.tsx`**
- `'Form Settings'` header label — add `builder.formSettings` key

**`src/components/builder/SectionCard.tsx`**
- `'Result Screen'`, `'shown after this section'` — add `builder.result.sectionTitle`, `builder.result.sectionSubtitle`
- `'Section description (optional)'` — add `builder.sectionDescription`
- Tooltip strings: `'Drag section'`, `'Expand section'`, `'Collapse section'`, `'Result screen'`, `'Branch logic'`, `'Delete section'`

**`src/components/builder/BranchRuleEditor.tsx`**
- `'Branch Logic'`, `'Active rules'`, `'No rules yet. Add one below...'`, `'Add at least one more section...'`
- `'Add new rule'`, `'Condition type'`, `'When the answer to…'`, `'…equals'`, `'When the score is…'`, `'Then jump to…'`
- `'Select a question…'`, `'Select an answer…'`, `'Select a section…'`, `'Add a Multiple choice or Checkboxes question...'`

**`src/components/builder/QuestionCard.tsx`**
- `'Missing question text'`, `'Needs ≥ 2 options'`, `'Empty option label'`
- Tooltip strings: `'Drag to reorder'`, `'Duplicate'`, `'Delete'`

**`src/components/builder/editors/ChoiceEditor.tsx`**
- `'Selection'`, `'Single'`, `'Multi'`, `'Option label (required)'`
- `'Add at least 2 options for respondents to choose from.'`
- `'Select between'`, `'and'`, `'options'`

**`src/components/builder/editors/ScaleEditor.tsx`**
- `'Range'`, `'Use scale value as points'`, `'Min label (e.g. Poor)'`, `'Max label (e.g. Excellent)'`

**`src/components/builder/ResultConfigEditor.tsx`**
- `'Score Ranges'`, `'Uploading…'`, `'Max must be ≥ min'`

**`src/pages/SurveyListPage.tsx`**
- `'My Surveys'`, `'Create, manage, and share surveys'`, `'Start a new survey'`, `'Recent surveys'`
- `'Blank survey'`, `'Creating…'`, `'No surveys yet'`, `'Click "Blank survey" above...'`

### Animations for language and sign-out buttons

In `src/components/shared/AppShell.tsx`, enhance the language toggle and sign-out buttons with Framer Motion:
- Import `motion` from `framer-motion` (already a project dependency)
- Wrap the `Globe` icon and button text in a `motion.span` with `whileHover={{ scale: 1.1 }}` and `whileTap={{ scale: 0.9 }}`
- Wrap the language toggle button with `motion.div` using `whileHover={{ y: -1 }}` and `whileTap={{ y: 1 }}` for a subtle lift effect
- Apply the same pattern to the sign-out button with `LogOut` icon
- Use `transition={{ duration: 0.15, ease: 'easeOut' }}` for snappy feedback

### Files affected
`src/i18n/en.json`, `src/i18n/ko.json`, `src/components/shared/AppShell.tsx`, `src/components/builder/BuilderSidebar.tsx`, `src/components/builder/SectionCard.tsx`, `src/components/builder/BranchRuleEditor.tsx`, `src/components/builder/QuestionCard.tsx`, `src/components/builder/editors/ChoiceEditor.tsx`, `src/components/builder/editors/ScaleEditor.tsx`, `src/components/builder/ResultConfigEditor.tsx`, `src/pages/SurveyListPage.tsx`
