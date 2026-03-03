import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LogOut, Globe, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import FeedbackDialog from '@/components/shared/FeedbackDialog'

interface AppShellProps { children: ReactNode }

export default function AppShell({ children }: AppShellProps) {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'ko' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 font-semibold text-gray-900 hover:text-orange-500 transition-colors"
          >
            <img src="/survey-builder-logo.svg" alt="SurveyBuilder" className="w-7 h-7" />
            {t('app.name')}
          </button>
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }} transition={{ duration: 0.13 }}>
              <Button variant="ghost" size="sm" onClick={() => setFeedbackOpen(true)} className="text-gray-500 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                <HelpCircle className="w-4 h-4 mr-1" />
                {t('feedback.button')}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }} transition={{ duration: 0.13 }}>
              <Button variant="ghost" size="sm" onClick={toggleLang} className="text-gray-500 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                <Globe className="w-4 h-4 mr-1" />
                {i18n.language === 'en' ? '한국어' : 'English'}
              </Button>
            </motion.div>
            {user && (
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }} transition={{ duration: 0.13 }}>
                <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4 mr-1" />
                  {t('auth.signOut')}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>

      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
