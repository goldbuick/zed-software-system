# Tape UI modules (`zss/screens/tape/`)

Shared pieces for the **terminal input line** and **code editor**: layout chrome, syntax colors, measurement, and **autocomplete** for `#` commands and ZSS word lists.

## Autocomplete pipeline

1. **`getautocomplete`** ([`autocomplete.ts`](autocomplete.ts)) takes the current `EDITOR_CODE_ROW` (or terminal line folded into the same shape), global cursor index, `GADGET_ZSS_WORDS` from the gadget client, and optional **`EDITOR_COMPLETE_CONTEXT`** (editor only). It inspects Chevrotain tokens, decides whether the cursor is in a command name, stat, or word-list context, and returns an `AUTO_COMPLETE` object: suggestions, prefix/positions, end-of-line firmware hint (`endoflineargs`), `maxsuggestionwordlen` (for layout), and `hintcommandname` (lowercase command after `#`).

2. **Arg resolution** — [`resolveargitems`](argcomplete.ts) applies this priority chain for tokens after a `#command` name:
   - `commandargmeta.whenfirst` / `byposition` keyword lists
   - `editorwhenfirst` / `editor` sources from [`buildeditorcompletecontext`](editorcomplete.ts) (labels, variables)
   - `listswhenfirst` / `lists` refs into `GADGET_ZSS_WORDS` pools (`objects`, `boards`, `stats`, `commands`, `roles`, …)
   - `ARG_TYPE` fallback for `COLOR`, `DIR`, `KIND`, and unions
   - Broad word-list merge when past the command signature length

   Firmware registers metadata via `.command(name, args, fn, argmeta?)` using types in [`firmware.ts`](../../firmware.ts). Shared keyword constants live in [`autocompleteconstants.ts`](../../firmware/autocompleteconstants.ts).

3. **Drawing** — [`drawautocomplete`](autocomplete.ts) renders the popup; per-suggestion colors use an explicit **`Map<string, COLOR>`** from [`createzsswordcolormap`](colors.ts) (built when `zsswords` changes), so we do not rebuild that map on every cursor move. [`drawcommandarghint`](autocomplete.ts) renders the compact firmware signature; optional ROM prose is passed as `options.romhint`.

4. **ROM help** — [`commandromhint`](commandarghints.ts) loads `editor:commands:<name>` from bundled Markdown under [`zss/rom/editor/commands/`](../../rom/editor/commands/). Hints use YAML front matter (`hint:`) or a legacy first line `desc;…` (see [`zss/rom/romhint.ts`](../../rom/romhint.ts)). Results are cached in a module-level `Map`.

5. **Shared UI helpers** — [`autocompleteui.ts`](autocompleteui.ts): `applyautocompletesuggestion` for Tab/accept, and `computeterminalarghintx` so the terminal’s end-of-line hint clears the autocomplete popup horizontally.

## Tests

- [`../../../ops/tests/unit/screens/tape/commandargmeta.autocomplete.test.ts`](../../../ops/tests/unit/screens/tape/commandargmeta.autocomplete.test.ts) — keyword `whenfirst` / `byposition` resolution
- [`../../../ops/tests/unit/screens/tape/argcomplete.test.ts`](../../../ops/tests/unit/screens/tape/argcomplete.test.ts) — lists, editor, and `resolveargitems` priority chain
- [`../../../ops/tests/unit/screens/tape/editorcomplete.test.ts`](../../../ops/tests/unit/screens/tape/editorcomplete.test.ts) — label/variable scanning
- [`../../../ops/tests/unit/screens/tape/commandarghints.test.ts`](../../../ops/tests/unit/screens/tape/commandarghints.test.ts) — `commandromhint` caching behavior

## See also

- [`zss/ARCHITECTURE.md`](../../ARCHITECTURE.md) — screens / gadget overview
- [`zss/screens/EXPORTED_FUNCTIONS.md`](../EXPORTED_FUNCTIONS.md) — export listing for this folder
