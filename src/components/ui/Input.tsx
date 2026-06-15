import type { InputHTMLAttributes, Ref } from 'react'
import { cn } from './cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>
}

export function Input({ ref, className, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-[var(--color-border)]',
        'bg-[var(--color-background)] px-3 py-2 text-sm',
        'placeholder:text-[var(--color-foreground)] placeholder:opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
