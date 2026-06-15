import type { InputHTMLAttributes, Ref } from 'react'
import { Input } from './Input'
import { cn } from './cn'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  helpText?: string
  ref?: Ref<HTMLInputElement>
}

export function FormField({
  id,
  label,
  error,
  helpText,
  ref,
  className,
  ...inputProps
}: FormFieldProps) {
  const describedBy = error
    ? `${id}-error`
    : helpText
      ? `${id}-help`
      : undefined

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-[var(--color-foreground)]"
      >
        {label}
      </label>
      <Input
        id={id}
        ref={ref}
        aria-describedby={describedBy}
        aria-invalid={!!error || undefined}
        className={cn(
          error && 'border-red-500 focus-visible:ring-red-500',
          className,
        )}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p
          id={`${id}-help`}
          className="text-sm text-[var(--color-foreground)] opacity-60"
        >
          {helpText}
        </p>
      )}
    </div>
  )
}
