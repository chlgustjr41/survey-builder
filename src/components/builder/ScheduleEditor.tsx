import { useTranslation } from 'react-i18next'
import { Calendar, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'
import { useState } from 'react'

function toDatetimeLocal(ts: number | null) {
  if (!ts) return ''
  const d = new Date(ts)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function fromDatetimeLocal(val: string): number | null {
  if (!val) return null
  return new Date(val).getTime()
}

export default function ScheduleEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  const [enabled, setEnabled] = useState(
    !!(draft?.schedule?.openAt || draft?.schedule?.closeAt)
  )

  if (!draft) return null

  const toggle = (v: boolean) => {
    setEnabled(v)
    if (!v) updateMeta({ schedule: { openAt: null, closeAt: null } })
  }

  const { openAt, closeAt } = draft.schedule
  const scheduleError =
    openAt && closeAt && openAt >= closeAt ? t('builder.schedule.error') : null

  return (
    <div className="flex flex-col gap-3">
      {/* Enable toggle */}
      <SidebarRow
        label={t('builder.schedule.title')}
        htmlFor="schedule-toggle"
      >
        <Switch
          id="schedule-toggle"
          checked={enabled}
          onCheckedChange={toggle}
        />
      </SidebarRow>

      {/* Date range inputs */}
      {enabled && (
        <div className="flex flex-col gap-2 pt-0.5">
          <DateField
            label={t('builder.schedule.openAt')}
            value={toDatetimeLocal(draft.schedule.openAt)}
            hasError={!!scheduleError}
            onChange={(v) =>
              updateMeta({ schedule: { ...draft.schedule, openAt: fromDatetimeLocal(v) } })
            }
          />
          <DateField
            label={t('builder.schedule.closeAt')}
            value={toDatetimeLocal(draft.schedule.closeAt)}
            hasError={!!scheduleError}
            onChange={(v) =>
              updateMeta({ schedule: { ...draft.schedule, closeAt: fromDatetimeLocal(v) } })
            }
          />
          {scheduleError && (
            <p className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {scheduleError}
            </p>
          )}
        </div>
      )}

      {/* Hint when disabled */}
      {!enabled && (
        <p className="flex items-start gap-1.5 text-[11px] text-gray-400 leading-snug">
          <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
          Set open and close times to automatically control survey availability.
        </p>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SidebarRow({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[28px]">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-gray-700 leading-snug cursor-pointer select-none"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function DateField({
  label,
  value,
  hasError,
  onChange,
}: {
  label: string
  value: string
  hasError: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-full text-xs rounded-md border px-2.5 py-1.5 bg-white text-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400',
          'transition-colors',
          hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300',
        ].join(' ')}
      />
    </div>
  )
}
