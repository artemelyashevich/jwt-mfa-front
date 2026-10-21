"use client"

import { ArrowLeftIcon } from "lucide-react"
import * as React from "react"

import { FormAlert } from "@/components/form-alert"
import { OtpInput } from "@/components/otp-input"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { formatSeconds } from "@/hooks/use-countdown"
import { ApiError } from "@/lib/api"

type OtpCodeStepProps = {
  email: string
  code: string
  onCodeChange: (code: string) => void
  error: ApiError | null
  codeError?: string
  pending: boolean
  /** Seconds until the code expires. */
  expiresIn: number
  /** Seconds until a new code may be requested. */
  resendIn: number
  /** Receives the code explicitly: on auto-submit the parent state is not updated yet. */
  onSubmit: (code: string) => void
  onResend: () => void
  onBack: () => void
  backLabel: string
}

/** Form for entering a 6-digit emailed code; submits automatically once all digits are entered. */
export function OtpCodeStep({
  email,
  code,
  onCodeChange,
  error,
  codeError,
  pending,
  expiresIn,
  resendIn,
  onSubmit,
  onResend,
  onBack,
  backLabel,
}: OtpCodeStepProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(code)
  }

  const expired = expiresIn === 0

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <FormAlert error={error} />
        <Field data-invalid={!!codeError || !!error}>
          <FieldLabel htmlFor="code" className="sr-only">
            Код из письма
          </FieldLabel>
          <OtpInput
            id="code"
            value={code}
            onChange={onCodeChange}
            onComplete={(value) => !pending && !expired && onSubmit(value)}
            invalid={!!codeError || !!error}
          />
          <FieldDescription aria-live="polite">
            Код отправлен на{" "}
            <span className="font-medium text-foreground">{email}</span>.{" "}
            {expired
              ? "Срок действия истёк — запросите новый."
              : `Действует ещё ${formatSeconds(expiresIn)}.`}
          </FieldDescription>
          <FieldError>{codeError}</FieldError>
        </Field>
        <Field>
          <Button
            type="submit"
            size="lg"
            className="h-10"
            disabled={pending || code.length !== 6}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Подтвердить
          </Button>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onBack}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              {backLabel}
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={pending || resendIn > 0}
              onClick={onResend}
            >
              {resendIn > 0
                ? `Повторно через ${formatSeconds(resendIn)}`
                : "Отправить ещё раз"}
            </Button>
          </div>
        </Field>
      </FieldGroup>
    </form>
  )
}
