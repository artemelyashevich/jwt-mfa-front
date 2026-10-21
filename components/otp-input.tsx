"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type OtpInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Called once all digits are entered (typed or pasted). */
  onComplete?: (value: string) => void
  length?: number
  invalid?: boolean
  disabled?: boolean
}

/**
 * Segmented one-time-code input. A single transparent native input sits over the cells,
 * so paste, SMS/email autofill (`one-time-code`) and screen readers work as with a plain field.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
}: OtpInputProps) {
  const [focused, setFocused] = React.useState(false)
  const activeIndex = Math.min(value.length, length - 1)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.replace(/\D/g, "").slice(0, length)
    onChange(next)
    if (next.length === length && next !== value) {
      onComplete?.(next)
    }
  }

  // Cells only render left-to-right, so keep the caret at the end.
  function keepCaretAtEnd(event: React.SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget
    input.setSelectionRange(input.value.length, input.value.length)
  }

  return (
    <div className="relative">
      <div className="flex gap-2" aria-hidden>
        {Array.from({ length }, (_, index) => {
          const active = focused && index === activeIndex
          return (
            <div
              key={index}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-lg border border-input bg-background font-mono text-xl font-medium tabular-nums transition-[border-color,box-shadow] dark:bg-input/30",
                active && "border-ring ring-3 ring-ring/50",
                invalid && "border-destructive",
                active && invalid && "ring-destructive/20",
                disabled && "opacity-50"
              )}
            >
              {value[index] ??
                (active && (
                  <span className="h-5 w-px animate-pulse bg-foreground" />
                ))}
            </div>
          )
        })}
      </div>
      <input
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={(e) => {
          setFocused(true)
          keepCaretAtEnd(e)
        }}
        onBlur={() => setFocused(false)}
        onSelect={keepCaretAtEnd}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`\\d{${length}}`}
        maxLength={length}
        required
        autoFocus
        disabled={disabled}
        aria-invalid={invalid}
        className="absolute inset-0 size-full cursor-text caret-transparent opacity-0"
      />
    </div>
  )
}
