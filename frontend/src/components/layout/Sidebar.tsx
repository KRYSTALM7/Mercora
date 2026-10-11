'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  BarChart3,
  Settings,
  LogOut,
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

  return (
    <aside
      className="container-sidebar w-64 shrink-0 text-white"
      style={{ background: 'linear-gradient(180deg, #1a2332 0%, #0f172a 100%)' }}
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
        >
          C
        </div>
        <div className="min-w-0">
          <p className="font-bold leading-tight truncate">Cascade Commerce</p>
          <p className="text-xs text-slate-400 truncate">Operations Platform</p>
        </div>
      </div>

      <nav className="sidebar-nav flex-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-item flex items-center gap-3 !text-slate-300 ${isActive ? 'active !text-cyan-400' : 'hover:!bg-white/5'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-6 pt-3 border-t border-white/10">
        <div className="px-4 py-2 mb-1">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm truncate">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="sidebar-nav-item w-full flex items-center gap-3 !text-slate-300 hover:!bg-white/5"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  )
}
