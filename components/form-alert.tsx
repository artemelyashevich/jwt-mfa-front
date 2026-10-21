import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { ApiError } from "@/lib/api"

/** Form-level error banner; field-specific messages are rendered next to their inputs. */
export function FormAlert({ error }: { error: ApiError | null }) {
  if (!error) {
    return null
  }
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}

export function toApiError(error: unknown) {
  return error instanceof ApiError ? error : new ApiError(0, null)
}
