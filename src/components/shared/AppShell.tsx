import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LogOut, Globe, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

interface AppShellProps { children: ReactNode }

export default function AppShell({ children }: AppShellProps) {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

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
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            {t('app.name')}
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleLang} className="text-gray-500">
              <Globe className="w-4 h-4 mr-1" />
              {i18n.language === 'en' ? '한국어' : 'English'}
            </Button>
            {user && (
              <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-500">
                <LogOut className="w-4 h-4 mr-1" />
                {t('auth.signOut')}
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
