'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createAuthClient } from '@/lib/supabase-auth'

const nav = [
  { href: '/dashboard', label: 'Home' },
  { href: '/sales', label: 'Sales' },
  { href: '/purchases', label: 'Purchases' },
  { href: '/banking', label: 'Banking' },
  { href: '/payroll', label: 'Payroll' },
  { href: '/vat', label: 'VAT 201' },
  { href: '/reports', label: 'Reports' },
  { href: '/setup', label: 'Setup' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createAuthClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  if (pathname.startsWith('/auth')) return null

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    const supabase = createAuthClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside
      className="w-36 flex flex-col shrink-0 border-r"
      style={{ background: 'var(--paper)', borderColor: 'var(--paper-edge)' }}
    >
      <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: 'var(--paper-edge)' }}>
        <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>myAccount</div>
        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted)' }}>ZA ZAR</div>
      </div>
      <nav className="flex-1 py-1">
        {nav.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-sm"
              style={{
                color: active ? 'var(--accent)' : 'var(--ink-2)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                fontWeight: active ? 600 : 400,
                borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t px-4 py-3" style={{ borderColor: 'var(--paper-edge)' }}>
        {email && (
          <div
            className="text-xs truncate mb-2"
            style={{ color: 'var(--muted)' }}
            title={email}
          >
            {email}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="text-xs"
          style={{ color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
