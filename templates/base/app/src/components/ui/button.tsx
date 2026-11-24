// @if ui-primitives
// Minimal stand-in for the shadcn/ui Button (same props subset), used because
// shadcn/ui was not selected.
import type { ComponentProps } from "react"

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive"
type Size = "default" | "sm" | "icon"

// @if tailwind
const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/85",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
}
const sizes: Record<Size, string> = { default: "h-9 px-3", sm: "h-8 px-2.5 text-sm", icon: "size-9" }

// @endif
export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  // @if tailwind
  const classes = [
    "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
    variants[variant],
    sizes[size],
    className,
  ]
  return <button type={type} className={classes.filter(Boolean).join(" ")} {...props} />
  // @else
  return <button type={type} className={className} data-variant={variant} data-size={size} {...props} />
  // @endif
}
// @endif
