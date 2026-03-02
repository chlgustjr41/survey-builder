import { nanoid } from 'nanoid'
import type { Survey } from '@/types/survey'

// ─── Shared rebuild logic ─────────────────────────────────────────────────────

interface IdMaps {
  sectionMap:   Record<string, string>
  questionMap:  Record<string, string>
  optionMap:    Record<string, string>
  textBlockMap: Record<string, string>
}

/**
 * Rebuilds all survey data using the provided old→new ID maps.
 * `newId()` is called for any ID that cannot be looked up from the maps
 * (branch rule IDs, score range IDs, identification field IDs).
 */
function rebuildSurvey(survey: Survey, maps: IdMaps, newId: () => string): Survey {
  const { sectionMap, questionMap, optionMap, textBlockMap } = maps

  // ── Rebuild sectionOrder ──────────────────────────────────────────────────
  const newSectionOrder = survey.sectionOrder.map((id) => sectionMap[id] ?? id)

  // ── Rebuild sections ──────────────────────────────────────────────────────
  const newSections: Survey['sections'] = {}
  for (const [oldSId, section] of Object.entries(survey.sections)) {
    const newSId = sectionMap[oldSId]

    const newQuestionOrder = section.questionOrder.map(
      (id) => questionMap[id] ?? textBlockMap[id] ?? id,
    )

    const newBranchRules = section.branchRules.map((rule) => ({
      ...rule,
      id: newId(),
      ...(rule.questionId !== undefined
        ? { questionId: questionMap[rule.questionId] ?? rule.questionId }
        : {}),
      ...(rule.optionId !== undefined
        ? { optionId: optionMap[rule.optionId] ?? rule.optionId }
        : {}),
      targetSectionId: sectionMap[rule.targetSectionId] ?? rule.targetSectionId,
    }))

    const newResultConfig = section.resultConfig
      ? {
          ...section.resultConfig,
          ranges:   section.resultConfig.ranges.map((r) => ({ ...r, id: newId() })),
          messages: section.resultConfig.messages?.map((m) => ({ ...m, id: newId() })),
        }
      : undefined

    newSections[newSId] = {
      ...section,
      id: newSId,
      questionOrder: newQuestionOrder,
      branchRules: newBranchRules,
      ...(newResultConfig !== undefined ? { resultConfig: newResultConfig } : {}),
    }
  }

  // ── Rebuild questions ─────────────────────────────────────────────────────
  const newQuestions: Survey['questions'] = {}
  for (const [oldQId, question] of Object.entries(survey.questions)) {
    const newQId = questionMap[oldQId]
    const newSId = sectionMap[question.sectionId] ?? question.sectionId

    newQuestions[newQId] = {
      ...question,
      id: newQId,
      sectionId: newSId,
      options: question.options?.map((opt) => ({
        ...opt,
        id: optionMap[opt.id] ?? opt.id,
      })),
    }
  }

  // ── Rebuild textBlocks ────────────────────────────────────────────────────
  const sourceBlocks = survey.textBlocks ?? {}
  const newTextBlocks: NonNullable<Survey['textBlocks']> = {}
  for (const [oldId, block] of Object.entries(sourceBlocks)) {
    const newTbId = textBlockMap[oldId]
    const newSId  = sectionMap[block.sectionId] ?? block.sectionId
    newTextBlocks[newTbId] = { ...block, id: newTbId, sectionId: newSId }
  }

  // ── Rebuild top-level resultConfig ────────────────────────────────────────
  const newResultConfig = {
    ...survey.resultConfig,
    ranges:   survey.resultConfig.ranges.map((r) => ({ ...r, id: newId() })),
    messages: survey.resultConfig.messages?.map((m) => ({ ...m, id: newId() })),
  }

  // ── Rebuild identificationFields ──────────────────────────────────────────
  const newIdentificationFields = survey.identificationFields.map((f) => ({
    ...f,
    id: newId(),
  }))

  return {
    ...survey,
    sectionOrder:          newSectionOrder,
    sections:              newSections,
    questions:             newQuestions,
    textBlocks:            Object.keys(newTextBlocks).length > 0 ? newTextBlocks : undefined,
    resultConfig:          newResultConfig,
    identificationFields:  newIdentificationFields,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Deep-clones a survey and regenerates every internal ID using `nanoid()`.
 * Used during **import** so the saved copy has no ID linkage to the source.
 */
export function remapSurveyIds(survey: Survey): Survey {
  const sectionMap:   Record<string, string> = {}
  const questionMap:  Record<string, string> = {}
  const optionMap:    Record<string, string> = {}
  const textBlockMap: Record<string, string> = {}

  for (const id of Object.keys(survey.sections))          sectionMap[id]   = nanoid()
  for (const [id, q] of Object.entries(survey.questions)) {
    questionMap[id] = nanoid()
    for (const opt of q.options ?? [])                    optionMap[opt.id] = nanoid()
  }
  for (const id of Object.keys(survey.textBlocks ?? {}))  textBlockMap[id] = nanoid()

  return rebuildSurvey(survey, { sectionMap, questionMap, optionMap, textBlockMap }, nanoid)
}

/**
 * Deep-clones a survey and replaces every internal ID with a short sequential
 * placeholder (e.g. `sec_1`, `q_3`, `o_2`).
 *
 * Used during **export** so the JSON file contains no identifying nanoid values.
 * IDs are assigned in natural display order (sectionOrder → questionOrder).
 * The `remapSurveyIds` call during import will replace these with real nanoid
 * values before the survey is written to the database.
 */
export function anonymizeSurveyIds(survey: Survey): Survey {
  const sectionMap:   Record<string, string> = {}
  const questionMap:  Record<string, string> = {}
  const optionMap:    Record<string, string> = {}
  const textBlockMap: Record<string, string> = {}

  let sIdx = 1, qIdx = 1, oIdx = 1, tbIdx = 1

  // Traverse in display order so IDs are sequential from top to bottom
  for (const sId of survey.sectionOrder) {
    if (!sectionMap[sId]) sectionMap[sId] = `sec_${sIdx++}`
    const section = survey.sections[sId]
    if (!section) continue
    for (const itemId of section.questionOrder) {
      const q = survey.questions[itemId]
      if (q && !questionMap[itemId]) {
        questionMap[itemId] = `q_${qIdx++}`
        for (const opt of q.options ?? []) {
          if (!optionMap[opt.id]) optionMap[opt.id] = `o_${oIdx++}`
        }
      } else if (survey.textBlocks?.[itemId] && !textBlockMap[itemId]) {
        textBlockMap[itemId] = `tb_${tbIdx++}`
      }
    }
  }
  // Defensive: catch anything not reachable via sectionOrder
  for (const id of Object.keys(survey.sections)) {
    if (!sectionMap[id]) sectionMap[id] = `sec_${sIdx++}`
  }
  for (const [id, q] of Object.entries(survey.questions)) {
    if (!questionMap[id]) {
      questionMap[id] = `q_${qIdx++}`
      for (const opt of q.options ?? []) {
        if (!optionMap[opt.id]) optionMap[opt.id] = `o_${oIdx++}`
      }
    }
  }
  for (const id of Object.keys(survey.textBlocks ?? {})) {
    if (!textBlockMap[id]) textBlockMap[id] = `tb_${tbIdx++}`
  }

  // Sequential counter for inline IDs (branch rules, score ranges, id-fields)
  let inlineIdx = 1
  const nextInlineId = () => `id_${inlineIdx++}`

  return rebuildSurvey(survey, { sectionMap, questionMap, optionMap, textBlockMap }, nextInlineId)
}
