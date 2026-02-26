import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Users, BarChart2, Mail, ChevronDown, ChevronRight, ListOrdered } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Users, Mail, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/stores/builderStore'
import IdentificationFieldsEditor from './IdentificationFieldsEditor'
import EmailConfigEditor from './EmailConfigEditor'
import ScheduleEditor from './ScheduleEditor'
import FormatConfigEditor from './FormatConfigEditor'

type Panel = 'schedule' | 'identification' | 'email'

const PANELS: { id: Panel; icon: React.ReactNode; labelKey: string; fallback: string }[] = [
  { id: 'schedule',       icon: <Calendar className="w-4 h-4" />, labelKey: '',                             fallback: 'Schedule'      },
  { id: 'identification', icon: <Users    className="w-4 h-4" />, labelKey: 'builder.identification.title', fallback: 'Identification' },
  { id: 'email',          icon: <Mail     className="w-4 h-4" />, labelKey: 'builder.email.title',          fallback: 'Email'          },
]

const CONTENT: Record<Panel, React.ReactNode> = {
  schedule:       <ScheduleEditor />,
  identification: <IdentificationFieldsEditor />,
  email:          <EmailConfigEditor />,
}

export default function BuilderSidebar() {
  const { t } = useTranslation()
  const { draft } = useBuilderStore()
  const [open, setOpen] = useState<Panel | null>(null)

  if (!draft) return null

  const toggle = (panel: Panel) => setOpen((p) => (p === panel ? null : panel))

  return (
    // ⚠ Do NOT use x/y/scale transforms here — motion.aside with a translate
    // creates a CSS "containing block" for position:fixed elements (including
    // Radix dialogs), shifting them off-screen even when the Portal renders at
    // document.body.  Use opacity-only so no transform is ever applied.
    <motion.aside
      className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex flex-col shrink-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Form Settings
        </p>
      </div>

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

      {/* Format Control */}
      <SidebarSection
        icon={<ListOrdered className="w-4 h-4" />}
        label={t('builder.format.title')}
        isOpen={open === 'format'}
        onToggle={() => toggle('format')}
      >
        <FormatConfigEditor />
      </SidebarSection>
    </aside>
      {/* Accordion panels */}
      {PANELS.map((panel, i) => {
        const label = panel.labelKey ? t(panel.labelKey) : panel.fallback
        const isOpen = open === panel.id
        return (
          <SidebarSection
            key={panel.id}
            icon={panel.icon}
            label={label}
            isOpen={isOpen}
            onToggle={() => toggle(panel.id)}
            delay={i * 0.06}
          >
            {CONTENT[panel.id]}
          </SidebarSection>
        )
      })}
    </motion.aside>
  )
}

// ── Collapsible section ────────────────────────────────────────────────────────
interface SectionProps {
  icon: React.ReactNode
  label: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  delay?: number
}

function SidebarSection({ icon, label, isOpen, onToggle, children, delay = 0 }: SectionProps) {
  return (
    <motion.div
      className="border-b border-gray-100 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, delay }}
    >
      {/* Orange active left bar */}
      <AnimatePresence>
        {isOpen && (
          <motion.span
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-400 rounded-r-full origin-center"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors
          ${isOpen
            ? 'bg-orange-50/60 text-orange-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
          }`}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.1 }}
      >
        {/* Icon with color animation */}
        <motion.span
          animate={{ color: isOpen ? '#f97316' : '#9ca3af' }}
          transition={{ duration: 0.18 }}
          className="shrink-0 flex"
        >
          {icon}
        </motion.span>

        <span className="flex-1 text-left">{label}</span>

        {/* Rotating chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="shrink-0 text-gray-300"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </motion.button>

      {/* Collapsible body — height 0 → auto */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              className="px-4 pb-4 pt-1 flex flex-col gap-2 bg-orange-50/20"
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              exit={{ y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
