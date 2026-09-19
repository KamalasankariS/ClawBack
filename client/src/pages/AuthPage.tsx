import { useState } from 'react'
import { api, setToken, setStoredUser } from '../api/client'
import { AlertCircle, LogIn, UserPlus, Check, X, Play } from 'lucide-react'

interface AuthResponse {
  token: string
  user: { id: number; email: string; employeeId: string; name: string; role: string }
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const allRulesPass = PASSWORD_RULES.every(r => r.test(password))

  const handleDemo = async () => {
    setDemoLoading(true)
    setError('')
    try {
      const result = await api<AuthResponse>('/auth/demo', { method: 'POST' })
      setToken(result.token)
      setStoredUser(result.user)
      onAuth()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDemoLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'register' && !allRulesPass) {
      setError('Password does not meet all requirements')
      return
    }
    setLoading(true)
    setError('')

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login'
        ? { email, password }
        : { email, employeeId, name, password }

      const result = await api<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      setToken(result.token)
      setStoredUser(result.user)
      onAuth()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="w-full max-w-sm mx-4 space-y-4">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-heading">ClawBack</h1>
          <p className="text-sm text-subtle mt-1">Track, dispute, and recover retailer deductions</p>
        </div>

        {/* Demo CTA */}
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-md"
        >
          <Play size={16} fill="currentColor" />
          {demoLoading ? 'Loading demo...' : 'Try the Live Demo'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-edge" />
          <span className="text-xs text-faint">or sign in with your account</span>
          <div className="flex-1 h-px bg-edge" />
        </div>

        {/* Auth form */}
        <div className="bg-panel rounded-xl shadow-lg border border-edge overflow-hidden">
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Toggle */}
            <div className="flex rounded-lg border border-edge overflow-hidden">
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                  mode === 'login' ? 'bg-accent text-white' : 'bg-panel text-subtle hover:bg-panel-hover'
                }`}
              >
                <LogIn size={14} /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                  mode === 'register' ? 'bg-accent text-white' : 'bg-panel text-subtle hover:bg-panel-hover'
                }`}
              >
                <UserPlus size={14} /> Register
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-md px-3 py-2">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-medium text-subtle mb-1 block">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full text-sm border border-edge rounded-md px-3 py-2.5 bg-input-bg text-heading"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-subtle mb-1 block">Employee ID</label>
                  <input
                    type="text"
                    required
                    className="w-full text-sm border border-edge rounded-md px-3 py-2.5 uppercase bg-input-bg text-heading"
                    placeholder="EMP-001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-subtle mb-1 block">Email</label>
              <input
                type="email"
                required
                className="w-full text-sm border border-edge rounded-md px-3 py-2.5 bg-input-bg text-heading"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-subtle mb-1 block">Password</label>
              <input
                type="password"
                required
                className="w-full text-sm border border-edge rounded-md px-3 py-2.5 bg-input-bg text-heading"
                placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === 'register' && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const passes = rule.test(password)
                    return (
                      <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${passes ? 'text-green-600 dark:text-green-400' : 'text-faint'}`}>
                        {passes ? <Check size={10} /> : <X size={10} />}
                        {rule.label}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (mode === 'register' && !allRulesPass)}
              className="w-full py-2.5 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
