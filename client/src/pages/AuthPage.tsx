import { useState } from 'react'
import { api, setToken, setStoredUser } from '../api/client'
import { AlertCircle, LogIn, UserPlus, Check, X } from 'lucide-react'

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

  const allRulesPass = PASSWORD_RULES.every(r => r.test(password))

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Confido</h1>
          <p className="text-sm text-gray-500 mt-0.5">Deduction Recovery Tool</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                mode === 'register' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserPlus size={14} /> Register
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2.5"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Employee ID</label>
                <input
                  type="text"
                  required
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2.5 uppercase"
                  placeholder="EMP-001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Work Email</label>
            <input
              type="email"
              required
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2.5"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
            <input
              type="password"
              required
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2.5"
              placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' && password.length > 0 && (
              <div className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passes = rule.test(password)
                  return (
                    <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${passes ? 'text-green-600' : 'text-gray-400'}`}>
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
            className="w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading
              ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
              : (mode === 'login' ? 'Sign In' : 'Create Account')
            }
          </button>
        </form>
      </div>
    </div>
  )
}
