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

   Firmware registers metadata via `.command(name, args, fn, argmeta?)` using types in [`firmware.ts`](../../firmware.ts). Shared keyword constants live in [`autocompleteconstants.ts`](../../firmware/autocompleteconstants.ts). **Register `argmeta` in the same change as any new `.command()` with a closed vocab or gadget word pool.**

3. **Drawing** — [`drawautocomplete`](autocomplete.ts) renders the popup; per-suggestion colors use an explicit **`Map<string, COLOR>`** from [`createzsswordcolormap`](colors.ts) (built when `zsswords` changes), so we do not rebuild that map on every cursor move. [`drawcommandarghint`](autocomplete.ts) renders the compact firmware signature; optional ROM prose is passed as `options.romhint`.

4. **ROM help** — [`commandromhint`](commandarghints.ts) loads `editor:commands:<name>` from bundled Markdown under [`zss/rom/editor/commands/`](../../rom/editor/commands/). Selected suggestion detail uses [`resolvesuggestionhint`](suggestionhints.ts) (`editor:<category>:<word>`, including `editor:commandargmeta:<word>` for firmware keyword args). Hints use YAML front matter (`hint:`) or a legacy first line `desc;…` (see [`zss/rom/romhint.ts`](../../rom/romhint.ts)). Command ROM results are cached in a module-level `Map`. While the autocomplete popup is open and the selected suggestion has a hint, that text replaces the purple end-of-line command signature.

5. **Shared UI helpers** — [`autocompleteui.ts`](autocompleteui.ts): `applyautocompletesuggestion` for Tab/accept, and `computeterminalarghintx` so the terminal’s end-of-line hint clears the autocomplete popup horizontally.

## Definition of done (every `#command`)

Each firmware command must land in exactly one of these states:

1. **Keyword / lists / editor meta** — `COMMAND_ARG_AUTOCOMPLETE` when there is a closed vocab (`byposition` / `whenfirst`) or gadget pool (`lists` / `editor`)
2. **ARG_TYPE covered** — signature already drives colors / dirs / kinds via `resolveargitems` (no extra argmeta required)
3. **Explicitly free-form / no-arg** — no keyword popup expected (`#play` notation, `#toast` text, `#idle`, pure numbers, …). Do not invent fake keyword lists for open strings.

Detail text prefers **many** keyword ROMs under `editor/commandargmeta/` and **few** selective command ROMs under `editor/commands/` (not one Markdown file per command). Editor ROM is client-bundled (Vite); ZNS `ops:zns:docs:publish` only covers `refscroll`, not autocomplete hints.

## Tests

- [`../../../ops/tests/unit/screens/tape/commandargmeta.autocomplete.test.ts`](../../../ops/tests/unit/screens/tape/commandargmeta.autocomplete.test.ts) — keyword `whenfirst` / `byposition` resolution
- [`../../../ops/tests/unit/screens/tape/argcomplete.test.ts`](../../../ops/tests/unit/screens/tape/argcomplete.test.ts) — lists, editor, and `resolveargitems` priority chain
- [`../../../ops/tests/unit/screens/tape/editorcomplete.test.ts`](../../../ops/tests/unit/screens/tape/editorcomplete.test.ts) — label/variable scanning
- [`../../../ops/tests/unit/screens/tape/commandarghints.test.ts`](../../../ops/tests/unit/screens/tape/commandarghints.test.ts) — `commandromhint` caching behavior

## See also

- [`zss/ARCHITECTURE.md`](../../ARCHITECTURE.md) — screens / gadget overview
- [`zss/screens/EXPORTED_FUNCTIONS.md`](../EXPORTED_FUNCTIONS.md) — export listing for this folder
