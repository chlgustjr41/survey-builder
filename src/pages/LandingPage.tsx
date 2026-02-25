import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage, isUserCancelledAuth } from '@/lib/errorMessage'

export default function LandingPage() {
  const { t } = useTranslation()
  const { user, loading, signIn } = useAuthStore()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/app')
  }, [user, loading, navigate])

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signIn()
    } catch (err) {
      if (!isUserCancelledAuth(err)) {
        const { message, detail } = getErrorMessage(err, 'Sign-in failed. Please try again.')
        toast.error(message, { description: detail })
      }
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {t('app.name')}
        </h1>
        <p className="text-lg text-gray-500 mb-8">{t('app.tagline')}</p>
        <Button
          size="lg"
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl text-base font-semibold shadow"
          onClick={handleSignIn}
          disabled={loading || signingIn}
        >
          {signingIn ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </motion.div>
    </div>
  )
}
