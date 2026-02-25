import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { Section, BranchRuleType, ScoreOperator } from '@/types/survey'

interface Props {
  section: Section
  onClose: () => void
}

export default function BranchRuleEditor({ section, onClose }: Props) {
  const { t } = useTranslation()
  const { draft, addBranchRule, removeBranchRule } = useBuilderStore()
  const [ruleType, setRuleType] = useState<BranchRuleType>('answer')
  const [questionId, setQuestionId] = useState('')
  const [optionId, setOptionId] = useState('')
  const [threshold, setThreshold] = useState(0)
  const [operator, setOperator] = useState<ScoreOperator>('gte')
  const [targetSectionId, setTargetSectionId] = useState('')
  const [addError, setAddError] = useState('')

  if (!draft) return null

  const questionsInSection = section.questionOrder
    .map((id) => draft.questions[id])
    .filter((q) => q && (q.type === 'radio' || q.type === 'checkbox'))

  const selectedQuestion = questionsInSection.find((q) => q.id === questionId)

  const otherSections = draft.sectionOrder
    .filter((id) => id !== section.id)
    .map((id) => draft.sections[id])
    .filter(Boolean)

  const handleAdd = () => {
    if (!targetSectionId) {
      setAddError('Please select a target section.')
      return
    }
    if (ruleType === 'answer') {
      if (!questionId) {
        setAddError('Please select a question.')
        return
      }
      if (!optionId) {
        setAddError('Please select an answer option.')
        return
      }
      addBranchRule(section.id, { type: 'answer', questionId, optionId, targetSectionId })
    } else {
      addBranchRule(section.id, { type: 'score', threshold, operator, targetSectionId })
    }
    setAddError('')
    setQuestionId('')
    setOptionId('')
    setTargetSectionId('')
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('builder.branchRules.title')} — {section.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Existing rules */}
          {section.branchRules.length > 0 && (
            <div className="flex flex-col gap-2">
              {section.branchRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded p-2">
                  <span className="flex-1 text-gray-600">
                    {rule.type === 'answer'
                      ? `If Q answer = "${draft.questions[rule.questionId ?? '']?.options?.find(o => o.id === rule.optionId)?.label ?? '?'}" → ${draft.sections[rule.targetSectionId]?.title ?? '?'}`
                      : `If score ${rule.operator} ${rule.threshold} → ${draft.sections[rule.targetSectionId]?.title ?? '?'}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeBranchRule(section.id, rule.id)}
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new rule */}
          <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setRuleType('answer')}
                className={`flex-1 text-xs py-1.5 rounded border transition-colors ${ruleType === 'answer' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600'}`}
              >
                {t('builder.branchRules.type.answer')}
              </button>
              <button
                onClick={() => setRuleType('score')}
                className={`flex-1 text-xs py-1.5 rounded border transition-colors ${ruleType === 'score' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600'}`}
              >
                {t('builder.branchRules.type.score')}
              </button>
            </div>

            {ruleType === 'answer' ? (
              <>
                <select
                  className="text-xs border border-gray-200 rounded p-1.5 w-full"
                  value={questionId}
                  onChange={(e) => { setQuestionId(e.target.value); setOptionId(''); setAddError('') }}
                >
                  <option value="">Select question...</option>
                  {questionsInSection.map((q) => (
                    <option key={q.id} value={q.id}>{q.prompt || 'Untitled question'}</option>
                  ))}
                </select>
                {selectedQuestion && (
                  <select
                    className="text-xs border border-gray-200 rounded p-1.5 w-full"
                    value={optionId}
                    onChange={(e) => setOptionId(e.target.value)}
                  >
                    <option value="">Select answer...</option>
                    {(selectedQuestion.options ?? []).map((o) => (
                      <option key={o.id} value={o.id}>{o.label || 'Unnamed option'}</option>
                    ))}
                  </select>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Score</span>
                <select
                  className="text-xs border border-gray-200 rounded p-1.5"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as ScoreOperator)}
                >
                  <option value="gte">≥</option>
                  <option value="lte">≤</option>
                </select>
                <Input
                  type="number"
                  className="w-20 h-7 text-xs"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">→ Jump to</span>
              <select
                className="flex-1 text-xs border border-gray-200 rounded p-1.5"
                value={targetSectionId}
                onChange={(e) => { setTargetSectionId(e.target.value); setAddError('') }}
              >
                <option value="">Select section...</option>
                {otherSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {addError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span>⚠</span> {addError}
              </p>
            )}
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs" onClick={handleAdd}>
              <Plus className="w-3 h-3 mr-1" />
              {t('builder.branchRules.add')}
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
