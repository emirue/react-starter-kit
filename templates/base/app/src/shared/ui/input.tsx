// @if ui-primitives
import type { ComponentProps } from "react"

export function Input({ className, ...props }: ComponentProps<"input">) {
  // @if tailwind
  const classes =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
  return <input className={className ? `${classes} ${className}` : classes} {...props} />
  // @else
  return <input className={className} {...props} />
  // @endif
}
// @endif
