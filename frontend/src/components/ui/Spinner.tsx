const SIZE_CLASS = {
  sm: 'spinner-sm',
  md: 'spinner-md',
  lg: 'spinner-lg',
}

export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={`spinner ${SIZE_CLASS[size]} rounded-full border-2 border-current border-t-transparent`} />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen text-primary-500">
      <Spinner size="lg" />
    </div>
  )
}
