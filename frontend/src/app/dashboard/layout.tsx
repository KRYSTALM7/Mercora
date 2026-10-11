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
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="container-main p-8">{children}</main>
    </div>
  )
}
