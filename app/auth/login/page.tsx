'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

function makeProblem() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const add = Math.random() > 0.5
  return add
    ? { question: `${a} + ${b}`, answer: a + b }
    : { question: `${a + b} − ${a}`, answer: b }
}

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState(() => makeProblem())
  const [captchaInput, setCaptchaInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshCaptcha = useCallback(() => {
    setCaptcha(makeProblem())
    setCaptchaInput('')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setError('Wrong answer — try again.')
      refreshCaptcha()
      return
    }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      setError('Incorrect password.')
      setLoading(false)
      refreshCaptcha()
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-80 card rounded-lg p-8">
        <div className="mb-6">
          <div className="font-semibold text-sm">myAccount</div>
          <div className="text-xs mt-0.5 text-muted">Sign in to continue</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              className="field outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="field-label">What is {captcha.question}?</label>
            <input
              type="number"
              value={captchaInput}
              onChange={e => setCaptchaInput(e.target.value)}
              required
              className="field outline-none"
              placeholder="Answer"
            />
          </div>

          {error && <div className="text-xs text-negative">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2"
            style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
