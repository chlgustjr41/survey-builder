import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'

function Divider() {
  return <div className="border-t border-gray-100 -mx-4" />
}

export default function GeneralSettingsEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  if (!draft) return null

  return (
    <div className="flex flex-col gap-4">

      {/* ── Language ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.general.language')}
        </p>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          {(['en', 'ko'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => updateMeta({ defaultLanguage: lang })}
              className={`flex-1 py-1.5 transition-colors ${
                (draft.defaultLanguage ?? 'en') === lang
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {lang === 'en' ? t('builder.general.languageEn') : t('builder.general.languageKo')}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 leading-snug">{t('builder.general.languageHint')}</p>
      </div>

      <Divider />

      {/* ── Responses ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.general.responses')}
        </p>
        <label className="flex items-center justify-between gap-3 min-h-7 cursor-pointer">
          <span className="text-xs font-medium text-gray-700">{t('builder.general.allowDuplicates')}</span>
          <Switch
            checked={draft.allowDuplicates ?? true}
            onCheckedChange={(v) => updateMeta({ allowDuplicates: v })}
          />
        </label>
        <p className="text-[10px] text-gray-400 leading-snug">{t('builder.general.allowDuplicatesHint')}</p>
      </div>

    </div>
  )
}
