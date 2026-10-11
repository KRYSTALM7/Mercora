import { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'approved' | 'rejected'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  shipped: 'info',
  completed: 'success',
  cancelled: 'error',
  refunded: 'warning',
  standard: 'info',
  premium: 'success',
  vip: 'warning',
  at_risk: 'error',
  churned: 'error',
}

export function statusToVariant(status: string): BadgeVariant {
  return STATUS_VARIANT[status?.toLowerCase()] || 'info'
}

export default function Badge({
  children,
  variant = 'info',
}: {
  children: ReactNode
  variant?: BadgeVariant
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
