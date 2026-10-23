"use client"

import {
  LogOutIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldUserIcon,
  TimerIcon,
  UserIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Brand } from "@/components/brand"
import { FormAlert, toApiError } from "@/components/form-alert"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { formatDate, LOCALES, Row, Rows, STATUS } from "@/components/user-rows"
import { formatSeconds, useCountdown } from "@/hooks/use-countdown"
import {
  accessTokenExpiresAt,
  api,
  ApiError,
  hasSession,
  type CurrentUser,
} from "@/lib/api"

function initials(user: CurrentUser) {
  const source = user.name?.trim() || user.email
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [error, setError] = React.useState<ApiError | null>(null)
  const [checking, setChecking] = React.useState(false)
  const [sessionNote, setSessionNote] = React.useState<string | null>(null)
  const [loggingOut, setLoggingOut] = React.useState(false)
  const { remaining: sessionLeft, start: startSessionCountdown } =
    useCountdown()

  const syncSessionCountdown = React.useCallback(() => {
    const expiresAt = accessTokenExpiresAt()
    if (expiresAt) {
      startSessionCountdown(
        Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
      )
    }
  }, [startSessionCountdown])

  const handleError = React.useCallback(
    (e: unknown) => {
      const apiError = toApiError(e)
      if (apiError.status === 401) {
        router.replace("/login")
      } else {
        setError(apiError)
      }
    },
    [router]
  )

  React.useEffect(() => {
    if (!hasSession()) {
      router.replace("/login")
      return
    }
    api.me().then((me) => {
      setUser(me)
      syncSessionCountdown()
    }, handleError)
  }, [router, syncSessionCountdown, handleError])

  // An expired access token is refreshed transparently by the API client on the next request.
  async function checkSession() {
    setChecking(true)
    setSessionNote(null)
    const before = accessTokenExpiresAt()
    try {
      setUser(await api.me())
      syncSessionCountdown()
      setSessionNote(
        accessTokenExpiresAt() !== before
          ? "Access-токен истёк и был обновлён по refresh-токену."
          : "Сессия активна, обновление не требовалось."
      )
    } catch (e) {
      handleError(e)
    } finally {
      setChecking(false)
    }
  }

  async function onLogout() {
    setLoggingOut(true)
    // Local tokens are dropped even if the backend call fails, so always leave the page.
    await api.logout().catch(() => undefined)
    router.replace("/login")
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-1">
            {user?.roles.includes("ADMIN") && (
              <Link
                href="/admin"
                className={buttonVariants({ variant: "ghost" })}
              >
                <ShieldUserIcon data-icon="inline-start" />
                Админ-панель
              </Link>
            )}
            <ThemeToggle />
            <Button variant="ghost" onClick={onLogout} disabled={loggingOut}>
              {loggingOut ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <LogOutIcon data-icon="inline-start" />
              )}
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
        <FormAlert error={error} />

        <section className="flex items-center gap-4">
          {user ? (
            <>
              <Avatar className="size-14">
                <AvatarFallback className="bg-primary text-lg font-medium text-primary-foreground">
                  {initials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {user.name ?? user.email}
                </h1>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </>
          ) : (
            !error && (
              <>
                <Skeleton className="size-14 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </>
            )
          )}
        </section>

        {user ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="size-4 text-muted-foreground" />
                  Профиль
                </CardTitle>
                <CardAction>
                  <Badge variant={STATUS[user.status].variant}>
                    {STATUS[user.status].label}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Rows>
                  <Row label="Имя">{user.name ?? "—"}</Row>
                  <Row label="Email">{user.email}</Row>
                  <Row label="Язык писем">
                    {LOCALES[user.locale] ?? user.locale.toUpperCase()}
                  </Row>
                  <Row label="Роли">
                    <span className="inline-flex gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </span>
                  </Row>
                </Rows>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 text-muted-foreground" />
                  Безопасность
                </CardTitle>
                <CardAction>
                  <Badge>2FA включена</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Rows>
                  <Row label="Второй фактор">Код на email</Row>
                  <Row label="Email подтверждён">
                    {formatDate(user.emailVerifiedAt)}
                  </Row>
                  <Row label="Последний вход">
                    {formatDate(user.lastLoginAt)}
                  </Row>
                </Rows>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TimerIcon className="size-4 text-muted-foreground" />
                  Сессия
                </CardTitle>
                <CardDescription>
                  Access-токен живёт недолго. Когда он истечёт, следующий запрос
                  незаметно обновит его по refresh-токену.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <span
                  className="font-mono text-4xl font-semibold tracking-tight tabular-nums"
                  aria-live="off"
                >
                  {formatSeconds(sessionLeft)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {sessionLeft > 0
                    ? "до истечения access-токена"
                    : "access-токен истёк — проверьте сессию, чтобы обновить его"}
                </span>
              </CardContent>
              <Separator />
              <CardFooter className="flex-wrap justify-between gap-3">
                <span className="text-sm text-muted-foreground" role="status">
                  {sessionNote}
                </span>
                <Button
                  variant="outline"
                  onClick={checkSession}
                  disabled={checking}
                >
                  {checking ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RefreshCwIcon data-icon="inline-start" />
                  )}
                  Проверить сессию
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          !error && (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-44 rounded-xl md:col-span-2" />
            </div>
          )
        )}
      </main>
    </div>
  )
}
