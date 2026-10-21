export function AuthHeading({
  title,
  description,
}: {
  title: string
  description: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-balance text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
