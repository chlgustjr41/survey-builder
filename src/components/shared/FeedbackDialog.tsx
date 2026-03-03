import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  BookOpen, MessageSquare, ChevronRight,
  PlusSquare, SplitSquareVertical, BarChart2,
  Mail, QrCode, Shuffle, Eye,
} from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'guide' | 'feedback'
type FeedbackType = 'bug' | 'feature'

// ── Feature guide items ───────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: PlusSquare,
    titleKey: 'feedback.guide.feature.sections',
    descKey:  'feedback.guide.feature.sectionsDesc',
  },
  {
    icon: BarChart2,
    titleKey: 'feedback.guide.feature.questions',
    descKey:  'feedback.guide.feature.questionsDesc',
  },
  {
    icon: SplitSquareVertical,
    titleKey: 'feedback.guide.feature.scoring',
    descKey:  'feedback.guide.feature.scoringDesc',
  },
  {
    icon: Shuffle,
    titleKey: 'feedback.guide.feature.branch',
    descKey:  'feedback.guide.feature.branchDesc',
  },
  {
    icon: Eye,
    titleKey: 'feedback.guide.feature.visibility',
    descKey:  'feedback.guide.feature.visibilityDesc',
  },
  {
    icon: Mail,
    titleKey: 'feedback.guide.feature.email',
    descKey:  'feedback.guide.feature.emailDesc',
  },
  {
    icon: QrCode,
    titleKey: 'feedback.guide.feature.qr',
    descKey:  'feedback.guide.feature.qrDesc',
  },
]

export default function FeedbackDialog({ open, onClose }: Props) {
  const { t } = useTranslation()
  const [tab, setTab]               = useState<Tab>('guide')
  const [type, setType]             = useState<FeedbackType>('bug')
  const [subject, setSubject]       = useState('')
  const [message, setMessage]       = useState('')

  const handleSend = () => {
    const mailto = encodeURIComponent(`[${type === 'bug' ? t('feedback.form.typeBug') : t('feedback.form.typeFeature')}] ${subject}`)
    const body   = encodeURIComponent(message)
    window.location.href = `mailto:chlgustjr41@gmail.com?subject=${mailto}&body=${body}`
    setSubject(''); setMessage('')
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-base">{t('feedback.title')}</DialogTitle>
        </DialogHeader>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 px-5 shrink-0">
          <button
            onClick={() => setTab('guide')}
            className={`flex items-center gap-1.5 py-2.5 px-1 mr-5 text-sm border-b-2 transition-colors ${
              tab === 'guide'
                ? 'border-orange-500 text-orange-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t('feedback.tabGuide')}
          </button>
          <button
            onClick={() => setTab('feedback')}
            className={`flex items-center gap-1.5 py-2.5 px-1 text-sm border-b-2 transition-colors ${
              tab === 'feedback'
                ? 'border-orange-500 text-orange-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {t('feedback.tabFeedback')}
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {tab === 'guide' && (
            <div className="px-5 py-4 space-y-1">
              <p className="text-xs text-gray-400 mb-4">{t('feedback.guide.intro')}</p>
              {FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
                <div key={titleKey} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t(titleKey)}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t(descKey)}</p>
                  </div>
                </div>
              ))}

              <div className="pt-4 pb-1">
                <button
                  onClick={() => setTab('feedback')}
                  className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
                >
                  {t('feedback.guide.sendFeedback')}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {tab === 'feedback' && (
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-gray-400">{t('feedback.form.intro')}</p>

              {/* Type selector */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  {t('feedback.form.type')}
                </label>
                <div className="flex gap-2">
                  {(['bug', 'feature'] as FeedbackType[]).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setType(opt)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        type === opt
                          ? 'border-orange-400 bg-orange-50 text-orange-600'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t(opt === 'bug' ? 'feedback.form.typeBug' : 'feedback.form.typeFeature')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  {t('feedback.form.subject')}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={t('feedback.form.subjectPlaceholder')}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  {t('feedback.form.message')}
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('feedback.form.messagePlaceholder')}
                  rows={5}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all resize-none"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={!subject.trim() || !message.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                size="sm"
              >
                {t('feedback.form.send')}
              </Button>

              <p className="text-[11px] text-gray-400 text-center">
                {t('feedback.form.hint')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
