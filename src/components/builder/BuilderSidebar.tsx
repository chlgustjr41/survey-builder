import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Users, Mail, ChevronDown, Hash, BarChart2, Settings, QrCode, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/stores/builderStore'
import IdentificationFieldsEditor from './IdentificationFieldsEditor'
import EmailConfigEditor from './EmailConfigEditor'
import ScheduleEditor from './ScheduleEditor'
import FormatControlEditor from './FormatControlEditor'
import ResultSettingEditor from './ResultSettingEditor'
import GeneralSettingsEditor from './GeneralSettingsEditor'
import QrSettingsEditor from './QrSettingsEditor'

const MIN_WIDTH = 240
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 320

type Panel = 'general' | 'schedule' | 'identification' | 'email' | 'format' | 'result' | 'qr'

const PANELS: { id: Panel; icon: React.ReactNode; labelKey: string; fallback: string }[] = [
  { id: 'general',        icon: <Settings   className="w-4 h-4" />, labelKey: 'builder.general.title',        fallback: 'General'         },
  { id: 'schedule',       icon: <Calendar   className="w-4 h-4" />, labelKey: 'builder.schedule.title',       fallback: 'Schedule'        },
  { id: 'identification', icon: <Users      className="w-4 h-4" />, labelKey: 'builder.identification.title', fallback: 'Identification'  },
  { id: 'email',          icon: <Mail       className="w-4 h-4" />, labelKey: 'builder.email.title',          fallback: 'Email'           },
  { id: 'format',         icon: <Hash       className="w-4 h-4" />, labelKey: 'builder.format.title',         fallback: 'Format'          },
  { id: 'result',         icon: <BarChart2  className="w-4 h-4" />, labelKey: 'builder.resultSettings.title', fallback: 'Result Settings' },
  { id: 'qr',             icon: <QrCode     className="w-4 h-4" />, labelKey: 'builder.qr.title',             fallback: 'QR Code'         },
]

const CONTENT: Record<Panel, React.ReactNode> = {
  general:        <GeneralSettingsEditor />,
  schedule:       <ScheduleEditor />,
  identification: <IdentificationFieldsEditor />,
  email:          <EmailConfigEditor />,
  format:         <FormatControlEditor />,
  result:         <ResultSettingEditor />,
  qr:             <QrSettingsEditor />,
}

interface Props {
  isOpen: boolean
  onToggle: () => void
}

export default function BuilderSidebar({ isOpen, onToggle }: Props) {
  const { t } = useTranslation()
  const { draft } = useBuilderStore()
  const [open, setOpen] = useState<Panel | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // On small screens default the sidebar to closed
  useEffect(() => {
    if (window.innerWidth < 768 && isOpen) {
      // nothing — parent controls; but we let parent decide the default
    }
  }, [isOpen])

  if (!draft) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const toggle = (panel: Panel) => setOpen((p) => (p === panel ? null : panel))

  // ── Mouse resize ────────────────────────────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + ev.clientX - startX.current))
      setSidebarWidth(newWidth)
    }
    const onMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // ── Touch resize ────────────────────────────────────────────────────────────
  const handleTouchResizeStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    startX.current = touch.clientX
    startWidth.current = sidebarWidth
    setIsResizing(true)

    const onTouchMove = (ev: TouchEvent) => {
      const t = ev.touches[0]
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + t.clientX - startX.current))
      setSidebarWidth(newWidth)
    }
    const onTouchEnd = () => {
      setIsResizing(false)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
  }

  return (
    <>
      {/* Mobile backdrop — animated in/out, tap outside to close */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            className="fixed inset-0 z-20 bg-black/30 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* ── Width-animated outer wrapper (desktop) ────────────────────────────
          Pure CSS width transition — NO transform applied here.
          CSS `width` does NOT create a containing block for position:fixed,
          so Radix dialogs continue to centre correctly via document.body portal.
          On mobile the aside is position:fixed so this wrapper is irrelevant
          (its width=0 has no layout effect); opacity handles show/hide instead. */}
      <div
        className={`overflow-hidden shrink-0 h-full ${
          isResizing ? '' : 'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
        }`}
        style={{ width: isMobile ? 0 : (isOpen ? sidebarWidth : 0) }}
      >
        {/* ⚠ Do NOT add x/y/scale transforms to this aside — they create a CSS
            "containing block" for position:fixed children (Radix dialogs), which
            would shift the portal off-screen. Opacity-only is safe.           */}
        <motion.aside
          className={`relative bg-white border-r border-gray-200 flex flex-col h-full ${
            isMobile ? 'fixed top-14 bottom-0 left-0 z-30 shadow-xl' : ''
          }`}
          style={{
            width: sidebarWidth,
            // Mobile: hide and disable interaction when closed
            ...(isMobile && !isOpen ? { pointerEvents: 'none' as const } : {}),
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Header — includes collapse button */}
          <div className="px-4 py-3.5 border-b border-gray-100 shrink-0 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {t('builder.formSettings')}
            </p>
            {/* Collapse button — always visible, big enough for touch */}
            <button
              onClick={onToggle}
              className="p-1.5 -mr-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors touch-manipulation"
              title={t('builder.sidebar.collapse')}
              aria-label={t('builder.sidebar.collapse')}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable accordion panels — inner div so resize handle sits outside overflow.
              min-h-0 is required: flex items default to min-height:auto, which prevents
              this flex-1 child from shrinking below content height (breaking scroll). */}
          <div
            className="flex-1 min-h-0 overflow-y-auto
              [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
          >
            {PANELS.map((panel, i) => {
              const label = panel.labelKey ? t(panel.labelKey) : panel.fallback
              const isOpenPanel = open === panel.id
              return (
                <SidebarSection
                  key={panel.id}
                  icon={panel.icon}
                  label={label}
                  isOpen={isOpenPanel}
                  onToggle={() => toggle(panel.id)}
                  delay={i * 0.06}
                >
                  {CONTENT[panel.id]}
                </SidebarSection>
              )
            })}
          </div>

          {/* Resize handle — outside the scroll container so it spans full sidebar height.
              Hidden on mobile (too narrow to tap accurately; users use the collapse button). */}
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleTouchResizeStart}
            className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-10 group hidden md:block"
          >
            <div className="absolute inset-y-0 right-0 w-px bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
          </div>
        </motion.aside>
      </div>
    </>
  )
}

// ── Reopen tab rendered by BuilderCanvas when sidebar is closed ─────────────
// (exported so BuilderCanvas can render it in the right DOM position)
export function SidebarReopenTab({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-1.5 px-2 py-2.5 bg-white border border-gray-200 rounded-r-lg shadow-sm
        text-gray-400 hover:text-orange-500 hover:border-orange-300 transition-colors touch-manipulation
        absolute left-0 top-4 z-10"
      title={t('builder.sidebar.expand')}
      aria-label={t('builder.sidebar.expand')}
    >
      <PanelLeftOpen className="w-4 h-4" />
    </button>
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
      className="border-b border-gray-100 relative overflow-hidden shrink-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, delay }}
    >
      {/* Orange active left bar */}
      <AnimatePresence>
        {isOpen && (
          <motion.span
            className="absolute left-0 top-0 bottom-0 w-0.75 bg-orange-400 rounded-r-full origin-center"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Trigger button — py-3 gives a comfortable 44px+ touch target */}
      <motion.button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors touch-manipulation
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
