import { useTranslation } from 'react-i18next'
import { useBuilderStore } from '@/stores/builderStore'
import type { IndexFormat, FormatConfig } from '@/types/survey'

function Divider() {
  return <div className="border-t border-gray-100 -mx-4" />
}

const FORMAT_OPTIONS: { value: IndexFormat; labelKey: string }[] = [
  { value: 'none',        labelKey: 'builder.format.none'       },
  { value: 'numeric',     labelKey: 'builder.format.numeric'    },
  { value: 'alpha-lower', labelKey: 'builder.format.alphaLower' },
  { value: 'alpha-upper', labelKey: 'builder.format.alphaUpper' },
]

interface RowProps {
  label: string
  value: IndexFormat
  onChange: (v: IndexFormat) => void
}

function FormatRow({ label, value, onChange }: RowProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 transition-colors border-r border-gray-200 last:border-r-0 ${
              value === opt.value
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FormatControlEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  if (!draft) return null

  const cfg = draft.formatConfig

  const update = (field: keyof FormatConfig, value: IndexFormat) =>
    updateMeta({ formatConfig: { ...cfg, [field]: value } })

  return (
    <div className="flex flex-col gap-4">
      <FormatRow
        label={t('builder.format.sections')}
        value={cfg.sectionIndex}
        onChange={(v) => update('sectionIndex', v)}
      />

      <Divider />

      <FormatRow
        label={t('builder.format.questions')}
        value={cfg.questionIndex}
        onChange={(v) => update('questionIndex', v)}
      />

      <Divider />

      <FormatRow
        label={t('builder.format.options')}
        value={cfg.optionIndex}
        onChange={(v) => update('optionIndex', v)}
      />
    </div>
  )
}
