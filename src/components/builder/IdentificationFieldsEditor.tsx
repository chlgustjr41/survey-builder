import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Trash2, Plus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'
import type { IdentificationField, PresetFieldKey } from '@/types/survey'

const PRESET_FIELDS: Array<{ key: PresetFieldKey; labelKey: string }> = [
  { key: 'name',       labelKey: 'builder.identification.preset.name'       },
  { key: 'dob',        labelKey: 'builder.identification.preset.dob'        },
  { key: 'email',      labelKey: 'builder.identification.preset.email'      },
  { key: 'phone',      labelKey: 'builder.identification.preset.phone'      },
  { key: 'employeeId', labelKey: 'builder.identification.preset.employeeId' },
  { key: 'studentId',  labelKey: 'builder.identification.preset.studentId'  },
]

export default function IdentificationFieldsEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  if (!draft) return null

  const fields = draft.identificationFields
  const customFields = fields.filter((f) => f.type === 'custom')

  const togglePreset = (key: PresetFieldKey) => {
    const exists = fields.find((f) => f.fieldKey === key)
    if (exists) {
      updateMeta({ identificationFields: fields.filter((f) => f.fieldKey !== key) })
    } else {
      const label = t(`builder.identification.preset.${key}`)
      const newField: IdentificationField = {
        id: nanoid(), type: 'preset', fieldKey: key, label, required: true,
      }
      updateMeta({ identificationFields: [...fields, newField] })
    }
  }

  const addCustom = () => {
    const newField: IdentificationField = {
      id: nanoid(), type: 'custom', fieldKey: 'custom', label: '', required: false,
    }
    updateMeta({ identificationFields: [...fields, newField] })
  }

  const updateCustomLabel = (id: string, label: string) =>
    updateMeta({ identificationFields: fields.map((f) => (f.id === id ? { ...f, label } : f)) })

  const removeField = (id: string) =>
    updateMeta({ identificationFields: fields.filter((f) => f.id !== id) })

  return (
    <div className="flex flex-col gap-3">
      {/* Hint */}
      <p className="flex items-start gap-1.5 text-[11px] text-gray-400 leading-snug">
        <User className="w-3 h-3 mt-0.5 shrink-0" />
        Collect respondent info before showing the survey.
      </p>

      {/* Preset field toggles */}
      <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {PRESET_FIELDS.map(({ key, labelKey }) => {
          const active = fields.some((f) => f.fieldKey === key)
          return (
            <label
              key={key}
              className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className={`text-xs transition-colors ${active ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                {t(labelKey)}
              </span>
              <Switch checked={active} onCheckedChange={() => togglePreset(key)} />
            </label>
          )
        })}
      </div>

      {/* Custom fields */}
      {customFields.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
            Custom Fields
          </p>
          {customFields.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5">
              <input
                value={f.label}
                onChange={(e) => updateCustomLabel(f.id, e.target.value)}
                placeholder="Field label…"
                className="flex-1 text-xs rounded-md border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
              />
              <button
                onClick={() => removeField(f.id)}
                className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom field button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs h-8 text-gray-500 border-dashed hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors"
        onClick={addCustom}
      >
        <Plus className="w-3 h-3 mr-1" />
        {t('builder.identification.addField')}
      </Button>
    </div>
  )
}
