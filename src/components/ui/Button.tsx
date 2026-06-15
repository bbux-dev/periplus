import { type ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

const variantClasses: Record<string, string> = {
  primary:   'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
  secondary: 'bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-muted)]',
  ghost:     'bg-transparent hover:bg-[var(--color-muted)]',
}

const sizeClasses: Record<string, string> = {
  sm:   'h-8 px-3 text-sm',
  md:   'h-10 px-4',
  lg:   'h-12 px-6 text-lg',
  icon: 'h-10 w-10 p-0',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses
  size?: keyof typeof sizeClasses
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
