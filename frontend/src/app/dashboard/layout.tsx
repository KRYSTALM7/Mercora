'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/layout/Sidebar'
import { FullPageSpinner } from '@/components/ui/Spinner'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading || !isAuthenticated) {
    return <FullPageSpinner />
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:h-screen md:min-h-0 md:overflow-hidden">
      <div className="flex flex-1 flex-col md:min-h-0 md:flex-row md:overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden">
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 md:overflow-y-auto">{children}</main>
          <footer className="border-t border-slate-200 bg-white px-4 sm:px-8 py-4 flex-shrink-0">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-slate-600">
                  <strong className="text-slate-900">Mercora</strong> — Run your operations. See beyond the next action.
                </p>
              </div>
              <div className="text-center sm:text-right">
                <a
                  href="https://cascade-web-gp5ciyqy6a-el.a.run.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <svg className="h-3 sm:h-4 w-3 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="hidden sm:inline">Go to Cascade Risk Analysis</span>
                  <span className="sm:hidden">Cascade</span>
                </a>
              </div>
            </div>
            <div className="mt-2 text-center text-xs text-slate-500">
              Mercora runs the business. Cascade helps keep autonomous actions from putting it at risk.
            </div>
            <div className="mt-2 text-center text-xs text-slate-400 border-t border-slate-100 pt-2">
              © 2026 Sujan Kumar (@KRYSTALM7). All rights reserved.
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
