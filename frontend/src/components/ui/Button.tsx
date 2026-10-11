import { ButtonHTMLAttributes } from 'react'
import Spinner from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
}

export default function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} gap-2 ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
