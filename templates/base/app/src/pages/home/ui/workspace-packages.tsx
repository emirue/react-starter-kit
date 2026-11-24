// @if pkg-shared || pkg-types || pkg-ui
// @if pkg-shared
import { formatList } from "@{{projectName}}/shared"
// @endif
// @if pkg-types
import type { Paginated } from "@{{projectName}}/types"
// @endif
// @if pkg-ui
import { Callout } from "@{{projectName}}/ui"
// @endif

// @if pkg-types
const PACKAGES: Paginated<string> = {
// @else
const PACKAGES = {
// @endif
  items: [
    // @if pkg-shared
    "@{{projectName}}/shared",
    // @endif
    // @if pkg-types
    "@{{projectName}}/types",
    // @endif
    // @if pkg-ui
    "@{{projectName}}/ui",
    // @endif
  ],
  page: 1,
  pageSize: 10,
  total: 0,
}

/** Shows that this app imports the shared workspace packages (monorepo only). */
export function WorkspacePackages() {
  // @if pkg-shared
  const text = `This app uses ${formatList(PACKAGES.items)}.`
  // @else
  const text = `This app uses ${PACKAGES.items.join(", ")}.`
  // @endif
  // @if pkg-ui
  return <Callout title="Workspace packages">{text}</Callout>
  // @else
  return <p className="text-sm text-muted-foreground">{text}</p>
  // @endif
}
// @endif
