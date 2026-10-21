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
import { cn } from "@/lib/utils"

type Step = "email" | "code" | "profile"

const STEPS: { id: Step; label: string; title: string; description: string }[] =
  [
    {
      id: "email",
      label: "Email",
      title: "Создайте аккаунт",
      description: "Укажите email — на него придёт код подтверждения.",
    },
    {
      id: "code",
      label: "Код",
      title: "Подтвердите email",
      description: "Введите 6-значный код из письма.",
    },
    {
      id: "profile",
      label: "Профиль",
      title: "Почти готово",
      description: "Придумайте имя и пароль для входа.",
    },
  ]

// Mirrors CompleteRegistrationRequest constraints: bcrypt only uses the first 72 bytes.
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_BYTES = 72
const NAME_MAX_LENGTH = 100

function validateProfile(
  name: string,
  password: string,
  passwordRepeat: string
) {
  const errors: Record<string, string> = {}
  if (!name.trim()) {
    errors.name = "Отображаемое имя не должно быть пустым"
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`
  } else if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    errors.password = `Пароль не должен превышать ${PASSWORD_MAX_BYTES} байта (кириллический символ занимает 2 байта)`
  }
  if (password !== passwordRepeat) {
    errors.passwordRepeat = "Пароли не совпадают"
  }
  return errors
}

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current)
  return (
    <ol className="mb-6 flex gap-2" aria-label="Шаги регистрации">
      {STEPS.map((step, index) => (
        <li
          key={step.id}
          aria-current={index === currentIndex ? "step" : undefined}
          className="flex flex-1 flex-col gap-1.5"
        >
          <span
            className={cn(
              "h-1 rounded-full bg-muted transition-colors",
              index <= currentIndex && "bg-primary"
            )}
          />
          <span
            className={cn(
              "text-xs text-muted-foreground",
              index === currentIndex && "font-medium text-foreground"
            )}
          >
            {index + 1}. {step.label}
          </span>
        </li>
      ))}
    </ol>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>("email")
  const [email, setEmail] = React.useState("")
  const [requestId, setRequestId] = React.useState("")
  const [code, setCode] = React.useState("")
  const [confirmationToken, setConfirmationToken] = React.useState("")
  const [name, setName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [passwordRepeat, setPasswordRepeat] = React.useState("")
  const [error, setError] = React.useState<ApiError | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {}
  )
  const [pending, setPending] = React.useState(false)
  const resend = useCountdown()
  const codeExpiry = useCountdown()
  const confirmationExpiry = useCountdown()

  React.useEffect(() => {
    if (hasSession()) {
      router.replace("/account")
    }
  }, [router])

  function goTo(next: Step) {
    setError(null)
    setFieldErrors({})
    setStep(next)
  }

  async function run(action: () => Promise<void>) {
    setPending(true)
    setError(null)
    setFieldErrors({})
    try {
      await action()
    } catch (e) {
      const apiError = toApiError(e)
      setError(apiError)
      setFieldErrors(apiError.fieldErrors)
    } finally {
      setPending(false)
    }
  }

  function sendCode() {
    return run(async () => {
      const otp = await api.startRegistration(email)
      setRequestId(otp.requestId)
      setCode("")
      resend.start(otp.resendAvailableInSeconds)
      codeExpiry.start(otp.expiresInSeconds)
      goTo("code")
    })
  }

  function onEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendCode()
  }

  function onCodeSubmit(value: string) {
    void run(async () => {
      let confirmation
      try {
        confirmation = await api.confirmOtp(requestId, value)
      } catch (e) {
        setCode("")
        throw e
      }
      setConfirmationToken(confirmation.confirmationToken)
      confirmationExpiry.start(confirmation.expiresInSeconds)
      goTo("profile")
    })
  }

  function onProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const localErrors = validateProfile(name, password, passwordRepeat)
    if (Object.keys(localErrors).length > 0) {
      setError(null)
      setFieldErrors(localErrors)
      return
    }
    void run(async () => {
      await api.completeRegistration(confirmationToken, name.trim(), password)
      router.replace("/account")
    })
  }

  const { title, description } = STEPS.find((s) => s.id === step)!
  const confirmationLost =
    confirmationExpiry.remaining === 0 ||
    error?.code === "OTP_CONFIRMATION_INVALID"

  return (
    <>
      <StepIndicator current={step} />
      <AuthHeading title={title} description={description} />

      {step === "email" && (
        <form onSubmit={onEmailSubmit}>
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
                maxLength={320}
                className="h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </Field>
            <Field>
              <Button
                type="submit"
                size="lg"
                className="h-10"
                disabled={pending}
              >
                {pending && <Spinner data-icon="inline-start" />}
                Получить код
              </Button>
              <FieldDescription className="text-center">
                Уже есть аккаунт? <Link href="/login">Войти</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      )}

      {step === "code" && (
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
          onBack={() => goTo("email")}
          backLabel="Изменить email"
        />
      )}

      {step === "profile" && (
        <form onSubmit={onProfileSubmit}>
          <FieldGroup>
            <FormAlert error={error} />
            <Field data-invalid={!!fieldErrors.name}>
              <FieldLabel htmlFor="name">Отображаемое имя</FieldLabel>
              <Input
                id="name"
                autoComplete="name"
                required
                autoFocus
                maxLength={NAME_MAX_LENGTH}
                className="h-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!fieldErrors.name}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </Field>
            <Field data-invalid={!!fieldErrors.password}>
              <FieldLabel htmlFor="password">Пароль</FieldLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
              />
              <FieldDescription>
                Не короче {PASSWORD_MIN_LENGTH} символов
              </FieldDescription>
              <FieldError>{fieldErrors.password}</FieldError>
            </Field>
            <Field data-invalid={!!fieldErrors.passwordRepeat}>
              <FieldLabel htmlFor="password-repeat">
                Повторите пароль
              </FieldLabel>
              <PasswordInput
                id="password-repeat"
                autoComplete="new-password"
                required
                value={passwordRepeat}
                onChange={(e) => setPasswordRepeat(e.target.value)}
                aria-invalid={!!fieldErrors.passwordRepeat}
              />
              <FieldError>{fieldErrors.passwordRepeat}</FieldError>
            </Field>
            <Field>
              {confirmationLost ? (
                <>
                  <FieldDescription>
                    Время на завершение регистрации истекло — подтвердите email
                    заново.
                  </FieldDescription>
                  <Button
                    type="button"
                    size="lg"
                    className="h-10"
                    onClick={() => goTo("email")}
                  >
                    Начать заново
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  className="h-10"
                  disabled={pending}
                >
                  {pending && <Spinner data-icon="inline-start" />}
                  Создать аккаунт
                </Button>
              )}
            </Field>
          </FieldGroup>
        </form>
      )}
    </>
  )
}
