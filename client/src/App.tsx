import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { DeductionsPage } from './pages/DeductionsPage'
import { DeductionDetailPage } from './pages/DeductionDetailPage'
import { ImportAuditPage } from './pages/ImportAuditPage'
import { AuthPage } from './pages/AuthPage'
import { ToastContainer } from './components/Toast'
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
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/deductions" element={<DeductionsPage />} />
          <Route path="/deductions/:id" element={<DeductionDetailPage />} />
          <Route path="/import-audit" element={<ImportAuditPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <ToastContainer />
    </>
  )
}
