import { useTranslation } from 'react-i18next'
import { useBuilderStore } from '@/stores/builderStore'
import type { IndexFormat } from '@/types/survey'

const FORMAT_OPTIONS: { value: IndexFormat; labelKey: string }[] = [
  { value: 'none', labelKey: 'builder.format.none' },
  { value: 'numeric', labelKey: 'builder.format.numeric' },
  { value: 'alpha', labelKey: 'builder.format.alpha' },
]

export default function FormatConfigEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  if (!draft) return null

  const cfg = draft.formatConfig

  const update = (field: keyof typeof cfg, value: IndexFormat) => {
    updateMeta({ formatConfig: { ...cfg, [field]: value } })
  }

  return (
    <div className="flex flex-col gap-3">
      <FormatRow
        label={t('builder.format.sections')}
        value={cfg.sectionIndex}
        onChange={(v) => update('sectionIndex', v)}
        t={t}
      />
      <FormatRow
        label={t('builder.format.questions')}
        value={cfg.questionIndex}
        onChange={(v) => update('questionIndex', v)}
        t={t}
      />
      <FormatRow
        label={t('builder.format.options')}
        value={cfg.optionIndex}
        onChange={(v) => update('optionIndex', v)}
        t={t}
      />
    </div>
  )
}

interface RowProps {
  label: string
  value: IndexFormat
  onChange: (v: IndexFormat) => void
  t: (key: string) => string
}

function FormatRow({ label, value, onChange, t }: RowProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="flex gap-1">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1 text-xs rounded border transition-colors ${
              value === opt.value
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-200 text-gray-600 hover:border-orange-300'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
