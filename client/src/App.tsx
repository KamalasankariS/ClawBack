import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { DeductionsPage } from './pages/DeductionsPage'
import { DeductionDetailPage } from './pages/DeductionDetailPage'
import { ImportAuditPage } from './pages/ImportAuditPage'
import { RecoveryPage } from './pages/RecoveryPage'
import { AuthPage } from './pages/AuthPage'
import { ToastContainer } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { getToken } from './api/client'

export default function App() {
  const [authed, setAuthed] = useState(!!getToken())

  if (!authed) {
    return (
      <>
        <AuthPage onAuth={() => setAuthed(true)} />
        <ToastContainer />
      </>
    )
  }

  return (
    <>
      <AppShell>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/deductions" element={<DeductionsPage />} />
            <Route path="/deductions/:id" element={<DeductionDetailPage />} />
            <Route path="/recovery" element={<RecoveryPage />} />
            <Route path="/import-audit" element={<ImportAuditPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
      <ToastContainer />
    </>
  )
}
