import { useTranslation } from 'react-i18next'
import { Calendar, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'
import { useState } from 'react'

function Divider() {
  return <div className="border-t border-gray-100 -mx-4" />
}

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
    <div className="flex flex-col gap-4">

      {/* ── Enable ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.schedule.title')}
        </p>
        <label className="flex items-center justify-between gap-3 min-h-7 cursor-pointer">
          <span className="text-xs font-medium text-gray-700">{t('builder.schedule.enable')}</span>
          <Switch id="schedule-toggle" checked={enabled} onCheckedChange={toggle} />
        </label>

        <AnimatePresence initial={false}>
          {!enabled && (
            <motion.p
              key="hint"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-1.5 text-[11px] text-gray-400 leading-snug"
            >
              <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
              {t('builder.schedule.hint')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Date range ─────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            key="date-fields"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex flex-col gap-4">
              <Divider />

              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {t('builder.schedule.dateRange')}
                </p>
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
                <AnimatePresence>
                  {scheduleError && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {scheduleError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

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
