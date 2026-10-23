"use client"

import { ArrowLeftIcon, SearchIcon, ShieldUserIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Brand } from "@/components/brand"
import { FormAlert, toApiError } from "@/components/form-alert"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { formatDate, LOCALES, Row, Rows, STATUS } from "@/components/user-rows"
import { api, ApiError, hasSession, type CurrentUser } from "@/lib/api"

export default function AdminPage() {
  const router = useRouter()
  // null while loading; the backend still enforces the role on every admin call.
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null)
  const [email, setEmail] = React.useState("")
  const [found, setFound] = React.useState<CurrentUser[] | null>(null)
  const [error, setError] = React.useState<ApiError | null>(null)
  const [pending, setPending] = React.useState(false)

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
    api.me().then((me) => setIsAdmin(me.roles.includes("ADMIN")), handleError)
  }, [router, handleError])

  async function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setFound(null)
    try {
      setFound(await api.adminSearchUsers(email))
    } catch (e) {
      handleError(e)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/account"
              className={buttonVariants({ variant: "ghost" })}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Аккаунт
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
        <section className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldUserIcon className="size-6 text-muted-foreground" />
            Админ-панель
          </h1>
          <p className="text-sm text-muted-foreground">
            Раздел доступен только пользователям с ролью ADMIN.
          </p>
        </section>

        {isAdmin === null && !error && <Skeleton className="h-40 rounded-xl" />}

        {isAdmin === false && (
          <FormAlert
            error={
              new ApiError(403, {
                message: "Доступ запрещён: нужна роль ADMIN.",
              })
            }
          />
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Поиск пользователей</CardTitle>
              <CardDescription>
                По email или его части, без учёта регистра.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSearch}>
                <FieldGroup>
                  <FormAlert error={error} />
                  <Field
                    orientation="horizontal"
                    data-invalid={!!error?.fieldErrors.email}
                  >
                    <FieldLabel htmlFor="email" className="sr-only">
                      Email
                    </FieldLabel>
                    <Input
                      id="email"
                      type="search"
                      maxLength={320}
                      required
                      autoFocus
                      placeholder="Email или его часть"
                      className="h-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!error?.fieldErrors.email}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="h-10"
                      disabled={pending}
                    >
                      {pending ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <SearchIcon data-icon="inline-start" />
                      )}
                      Найти
                    </Button>
                  </Field>
                  <FieldError>{error?.fieldErrors.email}</FieldError>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        )}

        {found && (
          <section className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground" role="status">
              {found.length > 0
                ? `Найдено: ${found.length}`
                : "Никого не нашли."}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {found.map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <CardTitle className="truncate">
                      {user.name ?? user.email}
                    </CardTitle>
                    <CardDescription>ID {user.id}</CardDescription>
                    <CardAction>
                      <Badge variant={STATUS[user.status].variant}>
                        {STATUS[user.status].label}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <Rows>
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
                      <Row label="Email подтверждён">
                        {formatDate(user.emailVerifiedAt)}
                      </Row>
                      <Row label="Последний вход">
                        {formatDate(user.lastLoginAt)}
                      </Row>
                    </Rows>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
