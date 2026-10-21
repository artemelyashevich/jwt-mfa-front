import { ShieldCheckIcon } from "lucide-react"
import Link from "next/link"

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-medium">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheckIcon className="size-4" />
      </span>
      JWT 2FA
    </Link>
  )
}
