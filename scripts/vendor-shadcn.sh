#!/usr/bin/env bash
# Re-vendors shadcn/ui components into templates/ from the official registry.
# Development-time only: generated projects never contact the registry.
#
#   SHADCN_VERSION=4.23.0 scripts/vendor-shadcn.sh
#
# Review the diff afterwards and re-run the validation matrix.
set -euo pipefail

SHADCN_VERSION="${SHADCN_VERSION:-4.23.0}"
STYLE="nova"
STANDARD=(button card input label badge skeleton separator)
ADMIN=(sidebar dialog sonner table avatar)

repo="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for base in base radix; do
  echo "== $base-$STYLE (shadcn@$SHADCN_VERSION)"
  (cd "$work" && CI=1 pnpm dlx "shadcn@$SHADCN_VERSION" init -t vite -b "$base" -p "$STYLE" -n "app-$base" --no-monorepo --yes </dev/null >/dev/null)
  app="$work/app-$base"
  (cd "$app" && CI=1 pnpm dlx "shadcn@$SHADCN_VERSION" add "${STANDARD[@]:1}" --yes --overwrite </dev/null >/dev/null)
  before="$(ls "$app/src/components/ui")"
  (cd "$app" && CI=1 pnpm dlx "shadcn@$SHADCN_VERSION" add "${ADMIN[@]}" --yes --overwrite </dev/null >/dev/null)

  std="$repo/templates/features/shadcn/when-ui-$base/app/src/components/ui"
  adm="$repo/templates/features/admin-layout/when-ui-$base/app/src"
  # Only the vendored directories are replaced; hand-written files next to them stay.
  rm -rf "$std" "$adm/components/ui"
  mkdir -p "$std" "$adm/components/ui"
  for f in $before; do cp "$app/src/components/ui/$f" "$std/$f"; done
  for f in $(ls "$app/src/components/ui"); do
    echo "$before" | grep -qx "$f" || cp "$app/src/components/ui/$f" "$adm/components/ui/$f"
  done
  # src/hooks/use-mobile.ts is not vendored: templates/features/admin-layout/app/src/hooks
  # holds a useSyncExternalStore version that passes react-hooks lint rules.
  # sonner's wrapper reads the theme from next-themes; use the project's provider instead.
  sed -i.bak 's#import { useTheme } from "next-themes"#import { useTheme } from "@/components/theme/use-theme"#' "$adm/components/ui/sonner.tsx"
  rm -f "$adm/components/ui/sonner.tsx.bak"
  node -e 'const p=require(process.argv[1]);console.log("   deps:",Object.keys(p.dependencies).join(" "))' "$app/package.json"
done
echo "Vendored shadcn@$SHADCN_VERSION ($STYLE)."
