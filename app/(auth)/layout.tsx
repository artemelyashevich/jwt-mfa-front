import { KeyRoundIcon, MailCheckIcon, TimerResetIcon } from "lucide-react"

import { Brand } from "@/components/brand"
import { ThemeToggle } from "@/components/theme-toggle"

const FEATURES = [
  {
    icon: MailCheckIcon,
    title: "Код при каждом входе",
    description: "После пароля на почту приходит одноразовый код.",
  },
  {
    icon: TimerResetIcon,
    title: "Короткие сессии",
    description: "Access-токен живёт минуты и обновляется незаметно.",
  },
  {
    icon: KeyRoundIcon,
    title: "Отзыв доступа",
    description: "Выход завершает сессию на сервере, а не только в браузере.",
  },
]

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-10">
        <header className="flex items-center justify-between">
          <Brand />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
      <aside className="relative hidden overflow-hidden border-l bg-muted/40 lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(70%_60%_at_70%_20%,black,transparent)] bg-[size:40px_40px]"
        />
        <div className="relative flex max-w-md flex-col gap-8">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Безопасный вход без лишних шагов
          </h2>
          <ul className="flex flex-col gap-5">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{title}</span>
                  <span className="text-sm text-muted-foreground">
                    {description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
