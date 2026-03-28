# Tape UI modules (`zss/screens/tape/`)

Shared pieces for the **terminal input line** and **code editor**: layout chrome, syntax colors, measurement, and **autocomplete** for `#` commands and ZSS word lists.

## Autocomplete pipeline

1. **`getautocomplete`** ([`autocomplete.ts`](autocomplete.ts)) takes the current `EDITOR_CODE_ROW` (or terminal line folded into the same shape), global cursor index, and `GADGET_ZSS_WORDS` from the gadget client. It inspects Chevrotain tokens, decides whether the cursor is in a command name, stat, or word-list context, and returns an `AUTO_COMPLETE` object: suggestions, prefix/positions, end-of-line firmware hint (`endoflineargs`), `maxsuggestionwordlen` (for layout), and `hintcommandname` (lowercase command after `#`).

2. **Drawing** — [`drawautocomplete`](autocomplete.ts) renders the popup; per-suggestion colors use an explicit **`Map<string, COLOR>`** from [`createzsswordcolormap`](colors.ts) (built when `zsswords` changes), so we do not rebuild that map on every cursor move. [`drawcommandarghint`](autocomplete.ts) renders the compact firmware signature; optional ROM prose is passed as `options.romhint`.

3. **ROM help** — [`commandromhint`](commandarghints.ts) loads `editor:commands:<name>` from bundled Markdown under [`zss/rom/editor/commands/`](../../rom/editor/commands/). Hints use YAML front matter (`hint:`) or a legacy first line `desc;…` (see [`zss/rom/romhint.ts`](../../rom/romhint.ts)). Results are cached in a module-level `Map`.

4. **Shared UI helpers** — [`autocompleteui.ts`](autocompleteui.ts): `applyautocompletesuggestion` for Tab/accept, and `computeterminalarghintx` so the terminal’s end-of-line hint clears the autocomplete popup horizontally.

## Tests

- [`__tests__/commandarghints.test.ts`](__tests__/commandarghints.test.ts) — `commandromhint` caching behavior.

## See also

- [`zss/ARCHITECTURE.md`](../../ARCHITECTURE.md) — screens / gadget overview
- [`zss/screens/EXPORTED_FUNCTIONS.md`](../EXPORTED_FUNCTIONS.md) — export listing for this folder
