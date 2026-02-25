import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">{t('builder.schedule.title')}</label>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>
      {enabled && (
        <>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('builder.schedule.openAt')}</label>
            <Input
              type="datetime-local"
              className="text-xs"
              value={toDatetimeLocal(draft.schedule.openAt)}
              onChange={(e) =>
                updateMeta({ schedule: { ...draft.schedule, openAt: fromDatetimeLocal(e.target.value) } })
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('builder.schedule.closeAt')}</label>
            <Input
              type="datetime-local"
              className="text-xs"
              value={toDatetimeLocal(draft.schedule.closeAt)}
              onChange={(e) =>
                updateMeta({ schedule: { ...draft.schedule, closeAt: fromDatetimeLocal(e.target.value) } })
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
