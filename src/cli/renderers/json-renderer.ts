/**
 * Serialize a value as pretty-printed JSON for `--json` output.
 *
 * `--json` deliberately routes here instead of a text renderer so stdout stays
 * pure JSON; logs go to stderr (technical-design.md §19.2).
 */
export function renderJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
