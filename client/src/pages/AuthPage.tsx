import { useState } from 'react'
import { api, setToken, setStoredUser } from '../api/client'
import { AlertCircle, LogIn, UserPlus, Check, X, Play, BarChart3, FileSearch, Shield, TrendingUp } from 'lucide-react'

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

const FEATURES = [
  { icon: BarChart3, title: 'See where the money goes', desc: 'Recovery rates, dispute aging, and which retailers cost you the most. All in one dashboard.' },
  { icon: FileSearch, title: 'Clean messy data automatically', desc: 'Import spreadsheet exports and the system normalizes names, dates, and amounts for you.' },
  { icon: Shield, title: 'Every action is on the record', desc: 'Triage, dispute, and resolve with mandatory notes. Nothing happens without a paper trail.' },
  { icon: TrendingUp, title: 'Dispute to resolution in one place', desc: 'Accept it, dispute it, or hold it. Then track it all the way to recovery.' },
]

export function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const allRulesPass = PASSWORD_RULES.every(r => r.test(password))
  const passwordsMatch = password === confirmPassword
  const registerReady = allRulesPass && passwordsMatch && confirmPassword.length > 0

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
    if (mode === 'register') {
      if (!allRulesPass) {
        setError('Password does not meet all requirements')
        return
      }
      if (!passwordsMatch) {
        setError('Passwords do not match')
        return
      }
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
    <div className="flex min-h-screen bg-surface">
      {/* Left panel — product story */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] items-center justify-center p-6">
        <div className="w-full max-w-2xl p-10 xl:p-14 flex flex-col min-h-[90vh]">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 rounded-md bg-[#c964cf]/20 flex items-center justify-center border border-[#c964cf]/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c964cf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 9a3.5 3.5 0 0 0-5 0L7 11.5" />
                <path d="M9.5 15a3.5 3.5 0 0 0 5 0L17 12.5" />
                <path d="M12 6v2" />
                <path d="M12 16v2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Bungee', cursive" }}><span className="text-[#fff44f]">C</span>law<span className="text-[#b868d8]">B</span>ack</h1>
              <p className="text-lg font-black text-[#fff44f]" style={{ fontFamily: "'Annie Use Your Telescope', cursive", letterSpacing: '0.04em' }}>Track, dispute, and recover retailer deductions</p>
            </div>
          </div>

          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h2 className="text-4xl xl:text-[2.75rem] font-bold text-white leading-[1.15] mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
              Stop losing money to{' '}
              <span className="text-[#c964cf]">invalid deductions</span>
            </h2>
            <p className="text-[15px] text-[#f5efe6] leading-relaxed mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>
              Retailers deduct millions from CPG payments every year. Many are wrong.
              ClawBack gives your team the workflow to find them, dispute them, and get the money back.
            </p>

            {/* Features */}
            <div className="space-y-0">
              {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                <div key={title} className={`flex gap-3 items-start py-4 ${i < FEATURES.length - 1 ? 'border-b border-dotted border-white/8' : ''}`}>
                  <Icon size={15} className="text-[#fff44f] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xl font-medium text-[#fff44f] mb-0.5" style={{ fontFamily: "'Fredericka the Great', serif" }}>{title}</h3>
                    <p className="text-[13px] text-[#f5efe6] leading-relaxed" style={{ fontFamily: "'Playfair Display', serif" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ backgroundImage: "url('/chalkboard-grid.svg')", backgroundRepeat: 'repeat', backgroundSize: '30px 30px' }}>
        <div className="w-full max-w-sm space-y-5">
          {/* Mobile brand (hidden on desktop) */}
          <div className="lg:hidden text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-md bg-label/15 border border-label/30 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-label)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 9a3.5 3.5 0 0 0-5 0L7 11.5" />
                  <path d="M9.5 15a3.5 3.5 0 0 0 5 0L17 12.5" />
                  <path d="M12 6v2" />
                  <path d="M12 16v2" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-heading" style={{ fontFamily: "'Bungee', cursive" }}>ClawBack</h1>
            </div>
            <p className="text-sm text-subtle" style={{ fontFamily: "'Annie Use Your Telescope', cursive", fontSize: '0.8rem' }}>Track, dispute, and recover retailer deductions</p>
          </div>

          {/* Demo CTA */}
          <button
            onClick={handleDemo}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
          >
            <Play size={16} fill="currentColor" />
            {demoLoading ? 'Loading demo...' : 'Try the Live Demo'}
          </button>
          <p className="text-center text-lg font-bold text-white -mt-1" style={{ fontFamily: "'Annie Use Your Telescope', cursive" }}>No account needed — explore everything instantly</p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-edge" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: "'Annie Use Your Telescope', cursive" }}>or use your account</span>
            <div className="flex-1 h-px bg-edge" />
          </div>

          {/* Auth form */}
          <div className="window-card shadow-lg">
            <div className="window-titlebar">
              <span>{mode === 'login' ? 'sign in' : 'create account'}</span>
              <div className="window-titlebar-dots"><span /><span /><span /></div>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Toggle */}
              <div className="flex rounded-lg border border-edge overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setConfirmPassword('') }}
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
                      placeholder="Your full name"
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
                      placeholder="e.g. CB-1234"
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
                  placeholder="you@clawback.app"
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
                {mode === 'register' && (
                  <div className="mt-2 space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passes = rule.test(password)
                      return (
                        <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${
                          password.length === 0
                            ? 'text-faint'
                            : passes
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-500 dark:text-red-400'
                        }`}>
                          {password.length === 0
                            ? <X size={10} className="opacity-40" />
                            : passes
                              ? <Check size={10} />
                              : <X size={10} />
                          }
                          {rule.label}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="text-xs font-medium text-subtle mb-1 block">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className={`w-full text-sm border rounded-md px-3 py-2.5 bg-input-bg text-heading ${
                      confirmPassword.length === 0
                        ? 'border-edge'
                        : passwordsMatch
                          ? 'border-green-400 dark:border-green-500'
                          : 'border-red-400 dark:border-red-500'
                    }`}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                      <X size={10} /> Passwords do not match
                    </p>
                  )}
                  {confirmPassword.length > 0 && passwordsMatch && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check size={10} /> Passwords match
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (mode === 'register' && !registerReady)}
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
    </div>
  )
}
