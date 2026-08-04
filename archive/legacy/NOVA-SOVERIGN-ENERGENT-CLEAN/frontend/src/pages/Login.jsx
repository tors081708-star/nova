import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../api.js'
import { Sparkles, Loader2 } from 'lucide-react'

const BG_IMG =
  'https://images.pexels.com/photos/31650443/pexels-photo-31650443.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('boss@nova.app')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await auth.login(email, password)
      localStorage.setItem('nova_token', res.access_token)
      localStorage.setItem('nova_email', res.email)
      window.dispatchEvent(new Event('nova-auth-change'))
      nav('/')
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grain min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      {/* Left decorative panel */}
      <div
        className="hidden lg:block relative"
        style={{
          backgroundImage: `linear-gradient(120deg, hsla(220,35%,4%,0.85), hsla(220,35%,4%,0.35)), url(${BG_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 p-12 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-brand/20 border border-brand/40 grid place-items-center">
              <Sparkles size={16} strokeWidth={1.5} className="text-brand" />
            </div>
            <span className="font-display text-lg tracking-wide">NOVA</span>
          </div>
          <div className="max-w-md">
            <div className="overline mb-4">Personal AI · Private by design</div>
            <h1 className="font-display text-4xl xl:text-5xl font-light tracking-tight leading-tight">
              A companion that remembers,<br /> thinks, and keeps up.
            </h1>
            <p className="mt-5 text-ink-muted leading-relaxed">
              Chat with context. Capture thoughts. Sort your day. Ask documents the hard questions.
              One quiet interface for the work that actually matters.
            </p>
          </div>
          <div className="overline">v1.0 · built for focus</div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex items-center justify-center px-6 py-12 relative z-10">
        <form
          onSubmit={submit}
          className="card w-full max-w-sm p-8 flex flex-col gap-4"
          data-testid="login-form"
        >
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-md bg-brand/20 border border-brand/40 grid place-items-center">
              <Sparkles size={16} strokeWidth={1.5} className="text-brand" />
            </div>
            <span className="font-display text-lg tracking-wide">NOVA</span>
          </div>

          <div>
            <div className="overline mb-2">Sign in</div>
            <h2 className="font-display text-2xl font-light">Welcome back.</h2>
            <p className="text-sm text-ink-muted mt-1">Your assistant is ready.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="boss@nova.app"
              className="field"
              autoComplete="email"
              required
              data-testid="login-email"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field"
              autoComplete="current-password"
              required
              data-testid="login-password"
            />
          </label>

          {err && (
            <div
              className="text-sm text-[hsl(0_62%_65%)] bg-[hsl(0_62%_10%)] border border-[hsl(0_62%_25%)] rounded-md px-3 py-2"
              data-testid="login-error"
            >
              {err}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-1"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Enter NOVA'}
          </button>

          <div className="text-xs text-ink-subtle mt-2">
            Default dev credentials · <span className="font-mono">boss@nova.app / NovaBoss2026!</span>
          </div>
        </form>
      </div>
    </div>
  )
}
