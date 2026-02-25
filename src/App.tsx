import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LandingPage from '@/pages/LandingPage'
import SurveyListPage from '@/pages/SurveyListPage'
import SurveyBuilderPage from '@/pages/SurveyBuilderPage'
import ResponsesPage from '@/pages/ResponsesPage'
import SurveyResponderPage from '@/pages/SurveyResponderPage'
import SurveyResultPage from '@/pages/SurveyResultPage'
import AuthGuard from '@/components/shared/AuthGuard'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    const unsub = init()
    return unsub
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/s/:id" element={<SurveyResponderPage />} />
        <Route path="/s/:id/result" element={<SurveyResultPage />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route path="/app" element={<SurveyListPage />} />
          <Route path="/app/surveys/new" element={<SurveyBuilderPage />} />
          <Route path="/app/surveys/:id/edit" element={<SurveyBuilderPage />} />
          <Route path="/app/surveys/:id/responses" element={<ResponsesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
