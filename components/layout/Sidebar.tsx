'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Home' },
  { href: '/sales',     label: 'Sales' },
  { href: '/purchases', label: 'Purchases' },
  { href: '/suppliers', label: 'Suppliers' },
  { href: '/banking',   label: 'Banking' },
  { href: '/payroll',   label: 'Payroll' },
  { href: '/vat',       label: 'VAT 201' },
  { href: '/reports',   label: 'Reports' },
  { href: '/setup',     label: 'Setup' },
  { href: '/settings',  label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  if (pathname.startsWith('/auth')) return null

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  return (
    <aside className="w-36 flex flex-col shrink-0 border-r border-paper-edge bg-paper">
      <div className="px-4 pt-5 pb-3 border-b border-paper-edge">
        <div className="font-semibold text-sm text-ink">myAccount</div>
        <div className="text-xs mt-0.5 num text-muted">ZA ZAR</div>
      </div>
      <nav className="flex-1 py-1">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            data-active={isActive(item.href)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-paper-edge px-4 py-3">
        <button onClick={handleSignOut} className="text-xs text-ink-2 bg-transparent border-none cursor-pointer p-0">
          Sign out
        </button>
      </div>
    </aside>
  )
}
