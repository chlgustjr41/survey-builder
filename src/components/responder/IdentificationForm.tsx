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
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('responder.identificationTitle')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('responder.identificationSubtitle')}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                {field.label}
                {field.required && <span className="text-orange-500 ml-0.5">*</span>}
              </label>
              <Input
                type={field.fieldKey === 'dob' ? 'date' : field.fieldKey === 'email' ? 'email' : 'text'}
                {...register(field.fieldKey, { required: field.required })}
                className={errors[field.fieldKey] ? 'border-red-400' : ''}
              />
              {errors[field.fieldKey] && (
                <p className="text-xs text-red-500 mt-1">{t('responder.required')}</p>
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
