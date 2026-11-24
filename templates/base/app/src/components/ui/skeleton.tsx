// @if ui-primitives
import type { ComponentProps } from "react"

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  // @if tailwind
  const classes = "animate-pulse rounded-md bg-muted"
  return <div aria-hidden="true" className={className ? `${classes} ${className}` : classes} {...props} />
  // @else
  return <div aria-hidden="true" className={className} {...props} />
  // @endif
}
// @endif
