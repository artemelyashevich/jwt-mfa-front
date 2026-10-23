import * as React from "react"

import type { UserStatus } from "@/lib/api"

export const STATUS: Record<
  UserStatus,
  { label: string; variant: "secondary" | "destructive" | "outline" }
> = {
  VERIFICATION_REQUIRE: {
    label: "Требуется подтверждение",
    variant: "outline",
  },
  ACTIVE: { label: "Активен", variant: "secondary" },
  BLOCKED: { label: "Заблокирован", variant: "destructive" },
}

export const LOCALES: Record<string, string> = {
  ru: "Русский",
  be: "Беларуская",
}

const dateFormat = new Intl.DateTimeFormat("ru", {
  dateStyle: "long",
  timeStyle: "short",
})

export function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : "—"
}

export function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  )
}

export function Rows({ children }: { children: React.ReactNode }) {
  return (
    <dl className="flex flex-col [&>*:not(:last-child)]:border-b">
      {children}
    </dl>
  )
}
