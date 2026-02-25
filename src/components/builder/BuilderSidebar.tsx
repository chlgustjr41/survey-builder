import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Users, BarChart2, Mail, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBuilderStore } from '@/stores/builderStore'
import IdentificationFieldsEditor from './IdentificationFieldsEditor'
import ResultConfigEditor from './ResultConfigEditor'
import EmailConfigEditor from './EmailConfigEditor'
import ScheduleEditor from './ScheduleEditor'

type Panel = 'settings' | 'identification' | 'result' | 'email'

export default function BuilderSidebar() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  const [open, setOpen] = useState<Panel>('settings')

  if (!draft) return null

  const toggle = (panel: Panel) => setOpen((p) => (p === panel ? 'settings' : panel))

  return (
    <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
      {/* Survey Settings */}
      <SidebarSection
        icon={<Settings className="w-4 h-4" />}
        label={t('builder.settings')}
        isOpen={open === 'settings'}
        onToggle={() => setOpen('settings')}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t('survey.title')}</label>
            <Input
              value={draft.title}
              onChange={(e) => updateMeta({ title: e.target.value })}
              placeholder="Survey title"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t('survey.description')}</label>
            <Textarea
              value={draft.description}
              onChange={(e) => updateMeta({ description: e.target.value })}
              placeholder="Optional description"
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <ScheduleEditor />
        </div>
      </SidebarSection>

      {/* Responder Identification */}
      <SidebarSection
        icon={<Users className="w-4 h-4" />}
        label={t('builder.identification.title')}
        isOpen={open === 'identification'}
        onToggle={() => toggle('identification')}
      >
        <IdentificationFieldsEditor />
      </SidebarSection>

      {/* Result Config */}
      <SidebarSection
        icon={<BarChart2 className="w-4 h-4" />}
        label={t('builder.result.title')}
        isOpen={open === 'result'}
        onToggle={() => toggle('result')}
      >
        <ResultConfigEditor />
      </SidebarSection>

      {/* Email Config */}
      <SidebarSection
        icon={<Mail className="w-4 h-4" />}
        label={t('builder.email.title')}
        isOpen={open === 'email'}
        onToggle={() => toggle('email')}
      >
        <EmailConfigEditor />
      </SidebarSection>
    </aside>
  )
}

interface SectionProps {
  icon: React.ReactNode
  label: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function SidebarSection({ icon, label, isOpen, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400">{icon}</span>
        {label}
        <span className="ml-auto text-gray-400">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4 flex flex-col gap-2">{children}</div>}
    </div>
  )
}
