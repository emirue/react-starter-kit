// @if ui-primitives
import type { ComponentProps } from "react"

// @if tailwind
const join = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ")

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={join("flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground", className)} {...props} />
}
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={join("flex flex-col gap-1", className)} {...props} />
}
export function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={join("font-semibold", className)} {...props} />
}
export function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={join("text-sm text-muted-foreground", className)} {...props} />
}
export function CardContent(props: ComponentProps<"div">) {
  return <div {...props} />
}
export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={join("flex items-center gap-2", className)} {...props} />
}
// @else
export function Card(props: ComponentProps<"section">) {
  return <section {...props} />
}
export function CardHeader(props: ComponentProps<"div">) {
  return <div {...props} />
}
export function CardTitle(props: ComponentProps<"div">) {
  return <div {...props} />
}
export function CardDescription(props: ComponentProps<"p">) {
  return <p {...props} />
}
export function CardContent(props: ComponentProps<"div">) {
  return <div {...props} />
}
export function CardFooter(props: ComponentProps<"div">) {
  return <div {...props} />
}
// @endif
// @endif
