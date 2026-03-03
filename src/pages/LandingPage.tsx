import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useInView } from 'framer-motion'
import { toast } from 'sonner'
import {
  LayoutList,
  GitBranch,
  BarChart3,
  QrCode,
  Star,
  ChevronRight,
  Check,
  ArrowRight,
  MessageSquare,
  Sliders,
  FileText,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage, isUserCancelledAuth } from '@/lib/errorMessage'

// ── Shared fade-in animation hook ──────────────────────────────────────────────
function useFadeInRef(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: threshold })
  return { ref, inView }
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

// ── Google "G" SVG icon ─────────────────────────────────────────────────────────
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const { user, loading, signIn } = useAuthStore()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)

  // No auto-redirect: logged-in users can visit the landing page and navigate
  // back to the dashboard by clicking their profile in the navbar.

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signIn()
      navigate('/app')
    } catch (err) {
      if (!isUserCancelledAuth(err)) {
        const { message, detail } = getErrorMessage(err, 'Sign-in failed. Please try again.')
        toast.error(message, { description: detail })
      }
    } finally {
      setSigningIn(false)
    }
  }

  const featuresRef = useFadeInRef()
  const stepsRef    = useFadeInRef()
  const ctaRef      = useFadeInRef()
  const footerRef   = useFadeInRef()

  // Feature cards — defined inside component so t() resolves on language change
  const featureItems = [
    { icon: LayoutList,   title: t('landing.features.types.title'),       desc: t('landing.features.types.desc') },
    { icon: GitBranch,    title: t('landing.features.branch.title'),      desc: t('landing.features.branch.desc') },
    { icon: Star,         title: t('landing.features.scoring.title'),     desc: t('landing.features.scoring.desc') },
    { icon: BarChart3,    title: t('landing.features.dashboard.title'),   desc: t('landing.features.dashboard.desc') },
    { icon: QrCode,       title: t('landing.features.qr.title'),          desc: t('landing.features.qr.desc') },
    { icon: Globe,        title: t('landing.features.multilingual.title'),desc: t('landing.features.multilingual.desc') },
  ]

  const stepItems = [
    { icon: FileText,      title: t('landing.steps.design.title'),  desc: t('landing.steps.design.desc') },
    { icon: MessageSquare, title: t('landing.steps.share.title'),   desc: t('landing.steps.share.desc') },
    { icon: Sliders,       title: t('landing.steps.analyse.title'), desc: t('landing.steps.analyse.desc') },
  ]

  const useCaseItems = [
    { title: t('landing.useCases.personality.title'),  desc: t('landing.useCases.personality.desc'),  checks: [t('landing.useCases.personality.check0'),  t('landing.useCases.personality.check1'),  t('landing.useCases.personality.check2')] },
    { title: t('landing.useCases.feedback.title'),     desc: t('landing.useCases.feedback.desc'),     checks: [t('landing.useCases.feedback.check0'),     t('landing.useCases.feedback.check1'),     t('landing.useCases.feedback.check2')] },
    { title: t('landing.useCases.events.title'),       desc: t('landing.useCases.events.desc'),       checks: [t('landing.useCases.events.check0'),       t('landing.useCases.events.check1'),       t('landing.useCases.events.check2')] },
    { title: t('landing.useCases.assessments.title'),  desc: t('landing.useCases.assessments.desc'),  checks: [t('landing.useCases.assessments.check0'),  t('landing.useCases.assessments.check1'),  t('landing.useCases.assessments.check2')] },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/survey-builder-logo.svg" alt="SurveyBuilder" className="w-7 h-7" />
            <span className="font-semibold text-gray-900 text-sm tracking-tight">SurveyBuilder</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = i18n.language === 'en' ? 'ko' : 'en'
                i18n.changeLanguage(next)
                localStorage.setItem('lang', next)
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500 transition-colors px-2 py-1 rounded-md hover:bg-orange-50"
            >
              <Globe className="w-3.5 h-3.5" />
              {i18n.language === 'en' ? '한국어' : 'English'}
            </button>

            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? ''}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-orange-200"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-xs font-semibold">
                    {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:block text-xs font-medium text-orange-700 max-w-24 truncate">
                  {user.displayName ?? user.email}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-orange-500" />
              </button>
            ) : (
              <Button
                size="sm"
                onClick={handleSignIn}
                disabled={loading || signingIn}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold px-4"
              >
                {signingIn ? t('auth.signingIn') : 'Sign in'}
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-linear-to-br from-orange-50 via-white to-amber-50 pt-24 pb-28 px-6">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-100 opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-24 w-72 h-72 rounded-full bg-amber-100 opacity-40 blur-3xl pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          className="relative max-w-3xl mx-auto text-center"
        >
          {/* Logo */}
          <motion.div variants={fadeUp} custom={0} className="flex justify-center mb-6">
            <img src="/survey-builder-logo.svg" alt="SurveyBuilder" className="w-20 h-20 drop-shadow-md" />
          </motion.div>

          {/* Badge */}
          <motion.div variants={fadeUp} custom={1} className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 rounded-full px-3.5 py-1 text-xs font-semibold mb-8 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            {t('landing.hero.badge')}
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={2}
            className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6"
          >
            {t('landing.hero.headlinePart1')}{' '}
            <span className="text-orange-500 relative">
              {t('landing.hero.headlinePart2')}
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                <path d="M2 9 Q75 2 150 9 Q225 16 298 9" stroke="#f97316" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={3}
            className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto"
          >
            {t('landing.hero.description')}
          </motion.p>

          <motion.div variants={fadeUp} custom={4} className="flex flex-col items-center justify-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="group flex items-center gap-3 bg-white border border-orange-300 hover:border-orange-400 hover:shadow-md transition-all rounded-xl px-5 py-3.5 text-sm font-medium text-orange-600 shadow-sm"
              >
                {t('landing.hero.goToDashboard')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={loading || signingIn}
                className="group flex items-center gap-3 bg-white border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all rounded-xl px-5 py-3.5 text-sm font-medium text-gray-700 shadow-sm disabled:opacity-60"
              >
                <GoogleIcon className="w-5 h-5" />
                {signingIn ? t('auth.signingIn') : t('landing.hero.cta')}
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            )}
            <p className="text-xs text-gray-400">{t('landing.hero.ctaHint')}</p>
          </motion.div>
        </motion.div>

        {/* ── Mini feature preview strip ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="max-w-4xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { label: t('landing.stats.types'), value: '3+' },
            { label: t('landing.stats.rules'), value: '∞' },
            { label: t('landing.stats.live'),  value: '⚡' },
            { label: t('landing.stats.langs'), value: '2' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/70 backdrop-blur border border-gray-100 rounded-2xl px-4 py-4 text-center shadow-sm"
            >
              <p className="text-2xl font-black text-orange-500">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white" ref={featuresRef.ref}>
        <motion.div
          initial="hidden"
          animate={featuresRef.inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">{t('landing.features.tag')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('landing.features.heading')}</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">{t('landing.features.subheading')}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureItems.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i + 1}
                className="group bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 rounded-2xl p-6 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50" ref={stepsRef.ref}>
        <motion.div
          initial="hidden"
          animate={stepsRef.inView ? 'visible' : 'hidden'}
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">{t('landing.steps.tag')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('landing.steps.heading')}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stepItems.map((step, i) => (
              <motion.div key={step.title} variants={fadeUp} custom={i + 1} className="relative">
                {/* Connector line between steps */}
                {i < stepItems.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px border-t-2 border-dashed border-orange-200" />
                )}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-md">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border-2 border-orange-200 text-orange-500 text-[10px] font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── What you can build ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">{t('landing.useCases.tag')}</p>
            <h2 className="text-3xl font-bold text-gray-900">{t('landing.useCases.heading')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {useCaseItems.map((card) => (
              <div key={card.title} className="border border-gray-100 rounded-2xl p-6 hover:border-orange-200 hover:shadow-sm transition-all">
                <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{card.desc}</p>
                <ul className="flex flex-col gap-1.5">
                  {card.checks.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-linear-to-br from-orange-500 to-amber-500" ref={ctaRef.ref}>
        <motion.div
          initial="hidden"
          animate={ctaRef.inView ? 'visible' : 'hidden'}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            {t('landing.cta.heading')}
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-orange-100 text-lg mb-10">
            {t('landing.cta.description')}
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="group inline-flex items-center gap-3 bg-white hover:bg-orange-50 text-orange-600 font-semibold rounded-xl px-7 py-4 shadow-lg hover:shadow-xl transition-all text-sm"
              >
                {t('landing.hero.goToDashboard')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={loading || signingIn}
                className="group inline-flex items-center gap-3 bg-white hover:bg-orange-50 text-gray-800 font-semibold rounded-xl px-7 py-4 shadow-lg hover:shadow-xl transition-all text-sm disabled:opacity-60"
              >
                <GoogleIcon className="w-5 h-5" />
                {signingIn ? t('auth.signingIn') : t('landing.cta.button')}
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer / Developer credit ───────────────────────────────────────── */}
      <footer className="py-16 px-6 bg-gray-50 border-t border-gray-100" ref={footerRef.ref}>
        <motion.div
          initial="hidden"
          animate={footerRef.inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto flex flex-col items-center gap-6"
        >
          {/* App mark */}
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2">
            <img src="/survey-builder-logo.svg" alt="SurveyBuilder" className="w-7 h-7" />
            <span className="text-sm font-semibold text-gray-700">SurveyBuilder</span>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="w-px h-6 bg-gray-200" />

          {/* Developer credit */}
          <motion.div
            variants={fadeUp}
            custom={2}
            className="flex flex-col items-center gap-3"
          >
            <img
              src="/dev-pfp.jpg"
              alt="Developer"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-orange-200 ring-offset-2"
            />
            <p className="text-sm text-gray-500">
              {t('landing.footer.developedBy')}{' '}
              <a
                href="mailto:chlgustjr41@gmail.com"
                className="font-medium text-orange-500 hover:text-orange-600 transition-colors"
              >
                chlgustjr41@gmail.com
              </a>
            </p>
          </motion.div>

          <motion.p variants={fadeUp} custom={3} className="text-xs text-gray-400 mt-2">
            {t('landing.footer.copyright', { year: new Date().getFullYear() })}
          </motion.p>
        </motion.div>
      </footer>

    </div>
  )
}
