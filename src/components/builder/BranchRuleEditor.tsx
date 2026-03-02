import { createPortal } from 'react-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Plus, GitBranch, ArrowRight, Info, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBuilderStore } from '@/stores/builderStore'
import type { Section, BranchRuleType, ScoreOperator } from '@/types/survey'

interface Props {
  section: Section
  onClose: () => void
}

export default function BranchRuleEditor({ section, onClose }: Props) {
  const { t } = useTranslation()
  const { draft, addBranchRule, removeBranchRule } = useBuilderStore()
  const [ruleType, setRuleType]               = useState<BranchRuleType>('answer')
  const [questionId, setQuestionId]           = useState('')
  const [optionId, setOptionId]               = useState('')
  const [threshold, setThreshold]             = useState(0)
  const [operator, setOperator]               = useState<ScoreOperator>('gte')
  const [targetSectionId, setTargetSectionId] = useState('')
  const [addError, setAddError]               = useState('')

  if (!draft) return null

  // Only visible 'choice' questions support answer-based branching
  const branchableQuestions = section.questionOrder
    .map((id) => draft.questions[id])
    .filter((q) => q && q.type === 'choice' && !q.hidden)

  const selectedQuestion = branchableQuestions.find((q) => q.id === questionId)

  // All other visible sections as valid jump targets
  const otherSections = draft.sectionOrder
    .filter((id) => id !== section.id)
    .map((id) => draft.sections[id])
    .filter((s) => s && !s.hidden)

  const noTargets = otherSections.length === 0

  // Warn about existing rules that point to now-hidden items
  const hiddenTargetRules = section.branchRules.filter((rule) => {
    const target = draft.sections[rule.targetSectionId]
    if (target?.hidden) return true
    if (rule.type === 'answer') {
      const q = draft.questions[rule.questionId ?? '']
      if (q?.hidden) return true
    }
    return false
  })

  // ── Add rule ────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!targetSectionId)                         { setAddError(t('builder.branchRules.selectTargetSection')); return }
    if (ruleType === 'answer' && !questionId)     { setAddError(t('builder.branchRules.selectQuestionError')); return }
    if (ruleType === 'answer' && !optionId)       { setAddError(t('builder.branchRules.selectAnswerOption')); return }

    if (ruleType === 'answer') {
      addBranchRule(section.id, { type: 'answer', questionId, optionId, targetSectionId })
    } else {
      addBranchRule(section.id, { type: 'score', threshold, operator, targetSectionId })
    }
    setAddError('')
    setQuestionId('')
    setOptionId('')
    setTargetSectionId('')
  }

  // ── Human-readable rule summary ─────────────────────────────────────────────
  const ruleLabel = (rule: Section['branchRules'][number]) => {
    if (rule.type === 'answer') {
      const q      = draft.questions[rule.questionId ?? '']
      const opt    = q?.options?.find((o) => o.id === rule.optionId)
      const qLabel = q?.prompt?.trim()    || t('builder.branchRules.untitledQuestion')
      const oLabel = opt?.label?.trim()   || t('builder.branchRules.unnamedOption')
      const target = draft.sections[rule.targetSectionId]?.title?.trim() || t('builder.branchRules.untitledSection')
      return { cond: `"${qLabel}" = "${oLabel}"`, target }
    } else {
      const op     = rule.operator === 'gte' ? '≥' : '≤'
      const target = draft.sections[rule.targetSectionId]?.title?.trim() || t('builder.branchRules.untitledSection')
      return { cond: `${t('builder.branchRules.ifScore')} ${op} ${rule.threshold} ${t('builder.pts')}`, target }
    }
  }

  // ── Portal render ────────────────────────────────────────────────────────────
  // We render directly to document.body using createPortal with a hand-rolled
  // flex-centered overlay. This is completely immune to CSS containing-block
  // interference from Framer Motion transforms, DnD transforms, or anything
  // else in the component tree.
  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 9998 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Panel wrapper — flex-centered, pointer-events passthrough ── */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9999, pointerEvents: 'none' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-dialog-title"
      >
        <div
          className="relative w-full max-w-md rounded-xl shadow-2xl flex flex-col"
          style={{
            backgroundColor: '#ffffff',
            maxHeight: '90vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
          }}
        >
          {/* ── Close button ── */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-sm p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            style={{ zIndex: 10 }}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-6 py-5 flex flex-col gap-4">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="pb-0">
              <h2
                id="branch-dialog-title"
                className="flex items-center gap-2 text-base font-semibold text-gray-900"
              >
                <GitBranch className="w-4 h-4 text-orange-500 shrink-0" />
                {t('builder.branchRules.title')}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {t('builder.branchRules.section')}:{' '}
                <span className="font-semibold text-gray-700">
                  {section.title || t('builder.branchRules.untitledSection')}
                </span>
              </p>
            </div>

            {/* ── Hidden-target warning ────────────────────────────────── */}
            {hiddenTargetRules.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                <span>
                  {hiddenTargetRules.length === 1
                    ? t('builder.branchRules.hiddenTargetWarning')
                    : t('builder.branchRules.hiddenTargetsWarning', { count: hiddenTargetRules.length })}
                </span>
              </div>
            )}

            {/* ── Active rules ─────────────────────────────────────────── */}
            <div>
              <SectionLabel>{t('builder.branchRules.activeRules')}</SectionLabel>
              {section.branchRules.length === 0 ? (
                <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {t('builder.branchRules.noRules')}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {section.branchRules.map((rule) => {
                    const { cond, target } = ruleLabel(rule)
                    const targetHidden = draft.sections[rule.targetSectionId]?.hidden
                    const questionHidden = rule.type === 'answer' && draft.questions[rule.questionId ?? '']?.hidden
                    const ruleHasHidden = targetHidden || questionHidden
                    return (
                      <div
                        key={rule.id}
                        className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border ${
                          ruleHasHidden
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-orange-50 border-orange-100'
                        }`}
                      >
                        <GitBranch className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800 truncate">{cond}</p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <ArrowRight className="w-3 h-3 text-orange-400" />
                            {target}
                          </p>
                        </div>
                        <button
                          onClick={() => removeBranchRule(section.id, rule.id)}
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          title={t('builder.branchRules.removeRule')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── No other sections warning ─────────────────────────── */}
            {noTargets ? (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                {t('builder.branchRules.needsMoreSections')}
              </div>
            ) : (
              /* ── Add rule form ────────────────────────────────────── */
              <div className="border border-gray-200 rounded-xl overflow-hidden">

                {/* Form header bar */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    {t('builder.branchRules.addNew')}
                  </p>
                </div>

                <div className="px-4 py-3.5 flex flex-col gap-4">

                  {/* Condition type segmented control */}
                  <div>
                    <FieldLabel>{t('builder.branchRules.conditionType')}</FieldLabel>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                      <button
                        onClick={() => setRuleType('answer')}
                        className={`flex-1 py-2 transition-colors ${
                          ruleType === 'answer'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {t('builder.branchRules.type.answer')}
                      </button>
                      <button
                        onClick={() => setRuleType('score')}
                        className={`flex-1 py-2 border-l border-gray-200 transition-colors ${
                          ruleType === 'score'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {t('builder.branchRules.type.score')}
                      </button>
                    </div>
                  </div>

                  {/* Condition inputs */}
                  {ruleType === 'answer' ? (
                    branchableQuestions.length === 0 ? (
                      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                        {t('builder.branchRules.needsChoiceQuestion')}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div>
                          <FieldLabel>{t('builder.branchRules.whenAnswerTo')}</FieldLabel>
                          <StyledSelect
                            value={questionId}
                            onChange={(e) => { setQuestionId(e.target.value); setOptionId(''); setAddError('') }}
                          >
                            <option value="">{t('builder.branchRules.selectQuestionPlaceholder')}</option>
                            {branchableQuestions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.prompt?.trim() || t('builder.branchRules.untitledQuestion')}
                              </option>
                            ))}
                          </StyledSelect>
                        </div>

                        {selectedQuestion && (
                          <div>
                            <FieldLabel>{t('builder.branchRules.equals')}</FieldLabel>
                            <StyledSelect
                              value={optionId}
                              onChange={(e) => setOptionId(e.target.value)}
                            >
                              <option value="">{t('builder.branchRules.selectAnswerPlaceholder')}</option>
                              {(selectedQuestion.options ?? []).map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label?.trim() || t('builder.branchRules.unnamedOption')}
                                </option>
                              ))}
                            </StyledSelect>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div>
                      <FieldLabel>{t('builder.branchRules.whenScore')}</FieldLabel>
                      <div className="flex items-center gap-2">
                        <StyledSelect
                          value={operator}
                          onChange={(e) => setOperator(e.target.value as ScoreOperator)}
                          className="w-36"
                        >
                          <option value="gte">{t('builder.branchRules.atLeast')}</option>
                          <option value="lte">{t('builder.branchRules.atMost')}</option>
                        </StyledSelect>
                        <input
                          type="number"
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="w-20 text-xs rounded-lg border border-gray-200 px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                        />
                        <span className="text-xs text-gray-400 shrink-0">{t('builder.pts')}</span>
                      </div>
                    </div>
                  )}

                  {/* Target section */}
                  <div>
                    <FieldLabel>{t('builder.branchRules.thenJumpTo')}</FieldLabel>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <StyledSelect
                        value={targetSectionId}
                        onChange={(e) => { setTargetSectionId(e.target.value); setAddError('') }}
                        className="flex-1"
                      >
                        <option value="">{t('builder.branchRules.selectSectionPlaceholder')}</option>
                        {otherSections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title?.trim() || t('builder.branchRules.untitledSection')}
                          </option>
                        ))}
                      </StyledSelect>
                    </div>
                  </div>

                  {/* Validation error */}
                  {addError && (
                    <p className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <Info className="w-3 h-3 shrink-0" />
                      {addError}
                    </p>
                  )}

                  {/* Add rule */}
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white w-full"
                    onClick={handleAdd}
                    disabled={
                      !targetSectionId ||
                      (ruleType === 'answer' && branchableQuestions.length === 0)
                    }
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {t('builder.branchRules.add')}
                  </Button>
                </div>
              </div>
            )}

            {/* Close */}
            <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-gray-600 mb-1">{children}</p>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string
  children: React.ReactNode
}

function StyledSelect({ className = '', children, ...props }: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="w-full appearance-none text-xs rounded-lg border border-gray-200 px-3 py-2 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors cursor-pointer"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  )
}
