# Style Guide

## Function Naming Convention

### Format

All function names use **lowercase without separators** - all lowercase, concatenated words with no underscores or hyphens.

✅ **Correct:**

- `memorycodepagetoprefix`
- `boardelementread`
- `createfirmware`
- `parsetarget`
- `readargs`

❌ **Incorrect:**

- `memoryCodePageToPrefix` (PascalCase)
- `board_element_read` (snake_case)
- `memory-codepage-to-prefix` (kebab-case)

### Structure Pattern

Function names follow the pattern: `[domain][action][target][qualifier]`

#### Domain Prefixes

Domain prefixes group related functionality by module/concern:

- **`memory*`** - Memory operations
  - `memoryreadbookbysoftware`
  - `memorysendtolog`
  - `memoryelementtodisplayprefix`

- **`board*`** - Board operations
  - `boardelementread`
  - `boardsafedelete`
  - `boardelementreadbyidorindex`

- **`book*`** - Book operations
  - `bookelementdisplayread`
  - `bookreadcodepagebyaddress`
  - `bookreadsortedcodepages`

- **`codepage*`** - Code page operations
  - `codepagereadname`
  - `codepagereadtype`
  - `codepagereadtypetostring`

- **`gadget*`** - Gadget operations
  - `gadgettext`
  - `gadgetstate`
  - `gadgethyperlink`

- **`vm*`** - Virtual machine operations (note: some legacy functions use `vm_*` with underscore)
  - `vmflush`
  - `vmloader`

- **`api*`** - API operations (note: some legacy functions use `api_*` with underscore)
  - `apichat`
  - `apilog`

#### Action Verbs

Common action verbs that indicate what the function does:

- **`read*`** - Reading/retrieving data
  - `memoryreadbookbysoftware`
  - `boardelementread`
  - `readargs`

- **`write*`** - Writing/setting data
  - `modemwriteinitstring`
  - `modemwritevaluenumber`

- **`create*`** - Creating new instances
  - `createfirmware`
  - `createdevice`
  - `createmessage`
  - `createsid`

- **`parse*`** - Parsing/transforming input
  - `parsetarget`
  - `parsesend`

- **`send*`** - Sending messages/data
  - `memorysendtolog`
  - `memorysendtoelement`
  - `memorysendtoelements`

- **`inspect*`** - Inspection/debugging operations
  - `memoryinspect`
  - `memoryinspectelement`
  - `memoryinspectarea`

- **`is*`** - Boolean predicates (see special case below)

#### Special Cases

**Boolean Functions:**
Boolean/predicate functions are prefixed with `is` (no domain prefix needed for simple checks):

- `ispid`
- `ispresent`
- `isstring`
- `isemail`
- `isoperator`

**Factory Functions:**
Factory/constructor functions are prefixed with `create`:

- `createfirmware`
- `createdevice`
- `createmessage`
- `createplatform`
- `createos`

### Examples

```typescript
// ✅ Good - domain prefix + action + target
export function memoryreadbookbysoftware(label: MEMORY_LABEL) {}
export function boardelementread(board: BOARD, pt: PT) {}
export function codepagereadname(codepage: CODE_PAGE) {}

// ✅ Good - boolean predicate
export function ispid(id: MAYBE<string>): id is string {}
export function ispresent<T>(value: MAYBE<T>): value is T {}

// ✅ Good - factory function
export function createfirmware(events?: FIRMWARE_EVENTS): FIRMWARE {}
export function createdevice(name: string): DEVICE {}

// ✅ Good - action + target
export function parsetarget(targetString: string) {}
export function readargs(words: WORD[], index: number, types: ARG_TYPE[]) {}

// ❌ Avoid - underscores
export function memory_read_book_by_software() {}
export function boardElementRead() {}
```

### Guidelines

1. **Be descriptive but concise** - Function names should clearly indicate what they do
2. **Use domain prefixes** - Group related functions with consistent prefixes
3. **Action-first after domain** - Put the action verb immediately after the domain prefix
4. **No abbreviations** - Use full words (e.g., `read` not `rd`, `element` not `elem`)
5. **Consistent ordering** - Follow the pattern: domain → action → target → qualifier

### Related Conventions

- **Type names**: Use PascalCase (e.g., `BOARD_ELEMENT`, `CODE_PAGE`, `FIRMWARE`)
- **Variable names**: Use camelCase (e.g., `mainbook`, `element`, `codepage`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MEMORY_LABEL`, `CODE_PAGE_TYPE`)
