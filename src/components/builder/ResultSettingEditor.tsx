import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'
import ResultConfigEditor from './ResultConfigEditor'
import type { ResultConfig } from '@/types/survey'

// ── Thin full-bleed divider between setting groups ─────────────────────────────
function Divider() {
  return <div className="border-t border-gray-100 -mx-4" />
}

export default function ResultSettingEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta, updateSection } = useBuilderStore()
  // Only one section result accordion open at a time
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  if (!draft) return null

  const scoringDisabled       = draft.scoringDisabled       ?? false
  const combineResultScreens  = draft.combineResultScreens  ?? false

  return (
    <div className="flex flex-col gap-4">

      {/* ── Scoring ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.resultSettings.scoring')}
        </p>
        <label className="flex items-center justify-between gap-3 min-h-7 cursor-pointer">
          <div>
            <span className="text-xs font-medium text-gray-700">
              {t('builder.resultSettings.disableScoring')}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
              {t('builder.resultSettings.disableScoringHint')}
            </p>
          </div>
          <Switch
            checked={scoringDisabled}
            onCheckedChange={(v) => updateMeta({ scoringDisabled: v })}
          />
        </label>
      </div>

      <Divider />

      {/* ── Display ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.resultSettings.display')}
        </p>
        <label className="flex items-center justify-between gap-3 min-h-7 cursor-pointer">
          <div>
            <span className="text-xs font-medium text-gray-700">
              {t('builder.resultSettings.combineResultScreens')}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
              {t('builder.resultSettings.combineResultScreensHint')}
            </p>
          </div>
          <Switch
            checked={combineResultScreens}
            onCheckedChange={(v) => updateMeta({ combineResultScreens: v })}
          />
        </label>
      </div>

      <Divider />

      {/* ── General result screen ──────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            {t('builder.resultSettings.generalResult')}
          </p>
          <Switch
            checked={!(draft.resultConfig.hideResults ?? false)}
            onCheckedChange={(v) =>
              updateMeta({ resultConfig: { ...draft.resultConfig, hideResults: !v } })
            }
          />
        </div>

        {(draft.resultConfig.hideResults ?? false) ? (
          <p className="text-[11px] text-gray-400 leading-snug">
            {t('builder.resultSettings.noResultScreen')}
          </p>
        ) : (
          <ResultConfigEditor
            config={draft.resultConfig}
            onChange={(cfg) => updateMeta({ resultConfig: cfg })}
            scoringDisabled={scoringDisabled}
            showHideToggle={false}
          />
        )}
      </div>

      <Divider />

      {/* ── Per-section result screens ─────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.resultSettings.sectionResults')}
        </p>

        {combineResultScreens && draft.sectionOrder.length > 0 && (
          <p className="text-[11px] text-orange-500 bg-orange-50 border border-orange-100 rounded-md px-3 py-2 leading-snug">
            {t('builder.resultSettings.sectionResultsCombinedNote')}
          </p>
        )}

        {draft.sectionOrder.length === 0 ? (
          <p className="text-xs text-gray-400">{t('builder.resultSettings.noSections')}</p>
        ) : (
          draft.sectionOrder.map((sId) => {
            const section = draft.sections[sId]
            if (!section) return null
            return (
              <SectionResultRow
                key={sId}
                title={section.title || t('builder.sectionTitle')}
                config={section.resultConfig ?? { showScore: false, hideResults: false, ranges: [], messages: [] }}
                scoringDisabled={scoringDisabled}
                isOpen={openSectionId === sId}
                onToggle={() => setOpenSectionId((prev) => (prev === sId ? null : sId))}
                onChange={(cfg) => updateSection(sId, { resultConfig: cfg })}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Collapsible per-section row ────────────────────────────────────────────────
interface SectionRowProps {
  title: string
  config: ResultConfig
  scoringDisabled: boolean
  isOpen: boolean
  onToggle: () => void
  onChange: (cfg: ResultConfig) => void
}

function SectionResultRow({ title, config, scoringDisabled, isOpen, onToggle, onChange }: SectionRowProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-left
          ${isOpen ? 'bg-orange-50/60 text-orange-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        <span className="flex-1 truncate">{title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="shrink-0 text-gray-300"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-3 border-t border-gray-100 bg-orange-50/10">
              <ResultConfigEditor
                config={config!}
                onChange={onChange}
                scoringDisabled={scoringDisabled}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
