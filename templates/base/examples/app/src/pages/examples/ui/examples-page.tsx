// @if example-pages
/** Index of /examples: the layout above renders the example navigation. */
export function ExamplesPage() {
  return (
    // @if tailwind
    <p className="text-sm text-muted-foreground">
      Pick an example above. Each one is a page slice in src/pages and can be deleted on its own.
    </p>
    // @else
    <p>Pick an example above. Each one is a page slice in src/pages and can be deleted on its own.</p>
    // @endif
  )
}
// @endif
