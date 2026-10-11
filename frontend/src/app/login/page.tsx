'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #0f172a 100%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="card shadow-lg p-12">
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                boxShadow: '0 8px 16px rgba(6, 182, 212, 0.3)',
              }}
            >
              C
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Cascade Commerce</h1>
            <p className="text-slate-600 text-sm mt-2">Operations Management Platform</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="input-field"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-200"
              style={{
                background: isLoading ? '#cbd5e1' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                boxShadow: isLoading ? 'none' : '0 4px 12px rgba(6, 182, 212, 0.3)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(6, 182, 212, 0.4)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                }
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">Don&apos;t have access to this platform?</p>
            <p className="text-sm mt-2">
              <a href="#" className="text-primary-500 hover:text-primary-600 font-semibold">
                Request access
              </a>
            </p>
          </div>
        </div>

        {/* Bottom text */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-300">Enterprise Operations Platform</p>
          <p className="text-xs text-slate-400 mt-1">Powered by AI • Secured by Enterprise Standards</p>
        </div>
      </div>
    </div>
  )
}
