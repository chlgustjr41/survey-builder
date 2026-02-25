import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { IdentificationField, PresetFieldKey } from '@/types/survey'

const PRESET_FIELDS: Array<{ key: PresetFieldKey; labelKey: string }> = [
  { key: 'name', labelKey: 'builder.identification.preset.name' },
  { key: 'dob', labelKey: 'builder.identification.preset.dob' },
  { key: 'email', labelKey: 'builder.identification.preset.email' },
  { key: 'phone', labelKey: 'builder.identification.preset.phone' },
  { key: 'employeeId', labelKey: 'builder.identification.preset.employeeId' },
  { key: 'studentId', labelKey: 'builder.identification.preset.studentId' },
]

export default function IdentificationFieldsEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  if (!draft) return null

  const fields = draft.identificationFields
  const hasCustom = fields.some((f) => f.type === 'custom')

  const togglePreset = (key: PresetFieldKey) => {
    const exists = fields.find((f) => f.fieldKey === key)
    if (exists) {
      updateMeta({ identificationFields: fields.filter((f) => f.fieldKey !== key) })
    } else {
      const label = t(`builder.identification.preset.${key}`)
      const newField: IdentificationField = { id: nanoid(), type: 'preset', fieldKey: key, label, required: true }
      updateMeta({ identificationFields: [...fields, newField] })
    }
  }

  const addCustom = () => {
    const newField: IdentificationField = { id: nanoid(), type: 'custom', fieldKey: 'custom', label: '', required: false }
    updateMeta({ identificationFields: [...fields, newField] })
  }

  const updateCustomLabel = (id: string, label: string) => {
    updateMeta({ identificationFields: fields.map((f) => (f.id === id ? { ...f, label } : f)) })
  }

  const removeField = (id: string) => {
    updateMeta({ identificationFields: fields.filter((f) => f.id !== id) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {PRESET_FIELDS.map(({ key, labelKey }) => {
          const active = fields.some((f) => f.fieldKey === key)
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-gray-700">{t(labelKey)}</span>
              <Switch checked={active} onCheckedChange={() => togglePreset(key)} />
            </div>
          )
        })}
      </div>

      {/* Custom fields */}
      {fields.filter((f) => f.type === 'custom').map((f) => (
        <div key={f.id} className="flex items-center gap-1.5">
          <Input
            value={f.label}
            onChange={(e) => updateCustomLabel(f.id, e.target.value)}
            placeholder="Custom field label"
            className="text-xs h-8"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeField(f.id)}>
            <Trash2 className="w-3 h-3 text-red-400" />
          </Button>
        </div>
      ))}

      {!hasCustom && (
        <Button variant="outline" size="sm" className="text-xs" onClick={addCustom}>
          + {t('builder.identification.addField')}
        </Button>
      )}
    </div>
  )
}
