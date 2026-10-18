'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleNavItems = NAV_ITEMS.filter(({ href }) => href !== '/dashboard/settings' || user?.role === 'admin')

  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileOpen])

  const Brand = () => (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 p-2 bg-white">
        <Image src="/cascade_logo.png" alt="Cascade Logo" width={40} height={40} className="w-full h-full object-contain" />
      </div>
      <div className="min-w-0">
        <p className="font-bold leading-tight truncate">Mercora</p>
        <p className="text-xs text-slate-400 truncate">Operations Platform</p>
      </div>
    </div>
  )

  const Navigation = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="Main navigation" className="sidebar-nav flex-1 px-3">
      {visibleNavItems.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/dashboard' ? pathname === href : pathname?.startsWith(href)
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={isActive ? 'page' : undefined}
            className={`sidebar-nav-item flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all duration-200 ease-in-out ${isActive ? 'active !text-white !bg-cyan-500/20 border-l-2 border-cyan-400 shadow-sm' : '!text-slate-300 hover:!text-white hover:!bg-white/10 hover:translate-x-1'}`}>
            <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
            <span className="truncate font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const AccountActions = () => (
    <div className="px-3 pb-6 pt-3 border-t border-white/10">
      <div className="px-4 py-2 mb-2 rounded-lg bg-white/5">
        <p className="text-xs text-slate-400 mb-0.5">Signed in as</p>
        <p className="text-sm truncate font-medium">{user?.email}</p>
      </div>
      <button type="button" onClick={logout} className="sidebar-nav-item w-full flex items-center gap-3 px-4 py-2.5 !text-slate-300 transition-all duration-200 ease-in-out hover:!text-white hover:!bg-red-500/20">
        <LogOut className="w-4 h-4 shrink-0" /><span className="font-medium">Log out</span>
      </button>
    </div>
  )

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 text-white shadow-md" style={{ background: 'linear-gradient(90deg, #1a2332 0%, #0f172a 100%)' }}>
        <Brand />
        <button type="button" aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((open) => !open)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>
      {mobileOpen && <button aria-label="Close navigation menu" className="md:hidden fixed inset-0 z-30 bg-slate-950/40" onClick={() => setMobileOpen(false)} />}
      <aside id="mobile-navigation" aria-label="Mobile navigation" className={`md:hidden fixed inset-y-0 right-0 z-40 flex w-[min(20rem,85vw)] flex-col overflow-y-auto text-white shadow-xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ background: 'linear-gradient(180deg, #1a2332 0%, #0f172a 100%)' }} aria-hidden={!mobileOpen} inert={!mobileOpen}>
        <div className="flex items-center justify-between px-5 py-5"><Brand /><button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 hover:bg-white/10"><X /></button></div>
        <Navigation onNavigate={() => setMobileOpen(false)} />
        <AccountActions />
      </aside>
      <aside className="container-sidebar hidden w-64 shrink-0 text-white md:flex" style={{ background: 'linear-gradient(180deg, #1a2332 0%, #0f172a 100%)' }}>
        <div className="px-6 py-6"><Brand /></div>
        <Navigation />
        <AccountActions />
      </aside>
    </>
  )
}
