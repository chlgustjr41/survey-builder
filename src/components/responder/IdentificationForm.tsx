import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { IdentificationField } from '@/types/survey'

interface Props {
  fields: IdentificationField[]
  onSubmit: (values: Record<string, string>) => void
}

export default function IdentificationForm({ fields, onSubmit }: Props) {
  const { t } = useTranslation()
  // Use field.id as key — custom fields all share fieldKey='custom', causing collisions
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>()

  const handleValid = (rawData: Record<string, string>) => {
    // Transform {fieldId: value} → {fieldKey or label: value} for readable storage
    const transformed: Record<string, string> = {}
    fields.forEach((field) => {
      const value = rawData[field.id]
      if (value !== undefined && value !== '') {
        const key = field.fieldKey === 'custom'
          ? (field.label || field.id)
          : field.fieldKey
        transformed[key] = value
      }
    })
    onSubmit(transformed)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('responder.identificationTitle')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('responder.identificationSubtitle')}</p>

        <form onSubmit={handleSubmit(handleValid)} className="flex flex-col gap-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                {field.label}
                {field.required && <span className="text-orange-500 ml-0.5">*</span>}
              </label>
              <Input
                type={field.fieldKey === 'dob' ? 'date' : field.fieldKey === 'email' ? 'email' : 'text'}
                {...register(field.id, {
                  required: field.required ? t('responder.required') : false,
                  ...(field.fieldKey === 'email' && {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address',
                    }
                  })
                })}
                className={errors[field.id] ? 'border-red-400 ring-1 ring-red-400' : ''}
                placeholder={
                  field.fieldKey === 'email' ? 'example@email.com' :
                  field.fieldKey === 'phone' ? '010-0000-0000' : ''
                }
              />
              {errors[field.id] && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span>⚠</span> {errors[field.id]?.message as string}
                </p>
              )}
            </div>
          ))}

          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-2">
            {t('responder.startSurvey')}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
