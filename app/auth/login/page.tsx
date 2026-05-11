'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase-auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createAuthClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div
        className="w-80 border rounded-lg p-8"
        style={{ background: 'var(--surface)', borderColor: 'var(--paper-edge)' }}
      >
        <div className="mb-6">
          <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>myAccount</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Sign in to continue</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border rounded px-3 py-2"
              style={{
                borderColor: 'var(--paper-edge)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                outline: 'none',
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
              style={{
                borderColor: 'var(--paper-edge)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                outline: 'none',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs" style={{ color: 'var(--negative)' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-sm font-medium"
            style={{
              background: loading ? 'var(--muted)' : 'var(--accent)',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
