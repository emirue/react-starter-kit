// @if ui-primitives
import type { ComponentProps } from "react"

export function Label({ className, ...props }: ComponentProps<"label">) {
  // @if tailwind
  const classes = "text-sm font-medium"
  return <label className={className ? `${classes} ${className}` : classes} {...props} />
  // @else
  return <label className={className} {...props} />
  // @endif
}
// @endif
