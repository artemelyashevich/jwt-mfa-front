"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { AuthHeading } from "@/components/auth-heading"
import { FormAlert, toApiError } from "@/components/form-alert"
import { OtpCodeStep } from "@/components/otp-code-step"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useCountdown } from "@/hooks/use-countdown"
import { api, ApiError, hasSession } from "@/lib/api"

type Step = "credentials" | "code"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>("credentials")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [requestId, setRequestId] = React.useState("")
  const [code, setCode] = React.useState("")
  const [error, setError] = React.useState<ApiError | null>(null)
  const [pending, setPending] = React.useState(false)
  const resend = useCountdown()
  const codeExpiry = useCountdown()

  React.useEffect(() => {
    if (hasSession()) {
      router.replace("/account")
    }
  }, [router])

  async function run(action: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(toApiError(e))
    } finally {
      setPending(false)
    }
  }

  function sendCode() {
    return run(async () => {
      const otp = await api.login(email, password)
      setRequestId(otp.requestId)
      setCode("")
      resend.start(otp.resendAvailableInSeconds)
      codeExpiry.start(otp.expiresInSeconds)
      setStep("code")
    })
  }

  function onCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendCode()
  }

  function onCodeSubmit(value: string) {
    void run(async () => {
      try {
        await api.confirmLogin(requestId, value)
      } catch (e) {
        setCode("")
        throw e
      }
      router.replace("/account")
    })
  }

  function backToCredentials() {
    setError(null)
    setStep("credentials")
  }

  const fieldErrors = error?.fieldErrors ?? {}

  if (step === "code") {
    return (
      <>
        <AuthHeading
          title="Подтвердите вход"
          description="Введите 6-значный код из письма — это второй фактор защиты аккаунта."
        />
        <OtpCodeStep
          email={email}
          code={code}
          onCodeChange={setCode}
          error={error}
          codeError={fieldErrors.code}
          pending={pending}
          expiresIn={codeExpiry.remaining}
          resendIn={resend.remaining}
          onSubmit={onCodeSubmit}
          onResend={() => void sendCode()}
          onBack={backToCredentials}
          backLabel="Назад"
        />
      </>
    )
  }

  return (
    <>
      <AuthHeading
        title="С возвращением"
        description="Войдите по email и паролю — затем подтвердите вход кодом из письма."
      />
      <form onSubmit={onCredentialsSubmit}>
        <FieldGroup>
          <FormAlert error={error} />
          <Field data-invalid={!!fieldErrors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              autoFocus
              className="h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
            />
            <FieldError>{fieldErrors.email}</FieldError>
          </Field>
          <Field data-invalid={!!fieldErrors.password}>
            <FieldLabel htmlFor="password">Пароль</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
            />
            <FieldError>{fieldErrors.password}</FieldError>
          </Field>
          <Field>
            <Button type="submit" size="lg" className="h-10" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Продолжить
            </Button>
            <FieldDescription className="text-center">
              Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  )
}
