# Lang Module - Exported Functions Summary

This document categorizes and summarizes all exported functions, types, enums, and constants from the `lang` module.

## 1. Core Compilation Functions

### `generator.ts`

- **`compile(name: string, text: string): GeneratorBuild`**
  - Main compilation entry point
  - Compiles source text into executable generator function
  - Returns errors, tokens, AST, labels, source map, and compiled code
  - Handles full compilation pipeline: tokenization → parsing → AST → transformation → code generation

- **`GeneratorFunc`** (type)
  - Type for compiled generator functions: `(api: CHIP) => 0 | 1`

- **`GeneratorBuild`** (type)
  - Return type for compilation results
  - Includes: errors, tokens, CST, AST, labels, source map, code, source

### `ast.ts`

- **`compileast(text: string)`**
  - Compiles text to AST representation
  - Returns: errors, tokens, CST, and AST
  - Main AST compilation entry point

---

## 2. Lexer & Tokenization

### `lexer.ts`

- **`tokenize(text: string)`**
  - Tokenizes input text into tokens
  - Returns lexer result with tokens and errors
  - Primary tokenization function

- **`LANG_ERROR`** (type)
  - Error type with: offset, line, column, length, message

#### Token Constants (Lexical Tokens)

**Structural Tokens:**
- `newline` - Newline token
- `whitespace` - Space token (skipped)
- `whitespaceandnewline` - Whitespace including newlines (skipped)
- `stat` - Statement token (`@...`)
- `command` - Command token (`#`)

**Content Tokens:**
- `text` - Plain text content
- `comment` - Comment text
- `label` - Label identifier
- `hyperlink` - Hyperlink
- `hyperlinktext` - Hyperlink text content

**Literal Tokens:**
- `stringliteral` - Single-quoted string
- `stringliteraldouble` - Double-quoted string
- `numberliteral` - Numeric literal

**Category Tokens:**
- `category_isterrain` - "isterrain" keyword
- `category_isobject` - "isobject" keyword

**Collision Tokens:**
- `collision_issolid`, `collision_iswalk`, `collision_isswim`
- `collision_isbullet`, `collision_isghost`
- `collision_iswalking`, `collision_iswalkable`
- `collision_isswimming`, `collision_isswimmable`

**Color Tokens:**
- `color_black`, `color_dkblue`, `color_dkgreen`, `color_dkcyan`
- `color_dkred`, `color_dkpurple`, `color_dkyellow`
- `color_ltgray`, `color_dkgray`, `color_blue`, `color_green`
- `color_cyan`, `color_red`, `color_purple`, `color_yellow`
- `color_white`, `color_brown`, `color_dkwhite`
- `color_ltgrey`, `color_gray`, `color_grey`, `color_dkgrey`
- `color_ltblack`
- `color_onblack`, `color_ondkblue`, `color_ondkgreen` (and other "on*" variants)

**Direction/Modifier Tokens:**
- Direction modifiers: `dir_mod_by`, `dir_mod_at`, `dir_mod_away`, `dir_mod_toward`
- `dir_mod_find`, `dir_mod_flee`, `dir_mod_to`, `dir_mod_within`
- `dir_mod_awayby`, `dir_mod_cw`, `dir_mod_ccw`, `dir_mod_opp`
- `dir_mod_rndp`, `dir_mod_rnd`, `dir_mod_rnds`

**Command Tokens:**
- Flow control: `command_if`, `command_else`, `command_while`, `command_repeat`
- `command_foreach`, `command_waitfor`, `command_break`, `command_continue`
- `command_do`, `command_done`
- Actions: `command_play`, `command_toast`, `command_ticker`

**Operator/Punctuation Tokens:**
- `lparen`, `rparen`, `lsquare`, `rsquare`, `lcurly`, `rcurly`
- `comma`, `colon`, `semicolon`, `dot`, `questionmark`
- `plus`, `minus`, `multiply`, `divide`, `mod_divide`, `floor_divide`
- `power`, `eq`, `not_eq`, `less_than`, `greater_than`
- `less_than_or_eq`, `greater_than_or_eq`
- `and_keyword`, `or_keyword`, `not_keyword`

**Special Tokens:**
- `dollar` - Dollar sign (`$`)
- `quote` - Single quote (`'`)
- `quotedouble` - Double quote (`"`)
- `slash` - Forward slash (`/`)
- `token_stop` - Stop token

---

## 3. Parser

### `parser.ts`

- **`parser`** (const)
  - Main parser instance (ScriptParser)
  - Used for parsing tokenized input into Concrete Syntax Tree (CST)

---

## 4. AST Types & Enums

### `visitor.ts`

#### Enums

- **`NODE`** (enum)
  - AST node type identifiers
  - Values: PROGRAM, API, LINE, MARK, GOTO, COUNT, TEXT, LABEL, HYPERLINK
  - STAT, MOVE, COMMAND, LITERAL
  - Structure: IF, IF_CHECK, IF_BLOCK, ELSE_IF, ELSE
  - Control flow: WHILE, BREAK, CONTINUE, REPEAT, WAITFOR, FOREACH
  - Expressions: OR, AND, NOT, COMPARE, COMPARE_ITEM, OPERATOR, OPERATOR_ITEM, EXPR

- **`COMPARE`** (enum)
  - Comparison operator types
  - IS_EQ, IS_NOT_EQ, IS_LESS_THAN, IS_GREATER_THAN
  - IS_LESS_THAN_OR_EQ, IS_GREATER_THAN_OR_EQ

- **`OPERATOR`** (enum)
  - Arithmetic operator types
  - EMPTY, PLUS, MINUS, POWER, MULTIPLY, DIVIDE
  - MOD_DIVIDE, FLOOR_DIVIDE, UNI_PLUS, UNI_MINUS

- **`LITERAL`** (enum)
  - Literal value types
  - NUMBER, STRING, TEMPLATE

#### Types

- **`CodeNode`** (type)
  - Main AST node type
  - Union type representing all possible AST node structures
  - Includes location information (startOffset, endOffset, line, column)
  - Includes range information for code completion

#### Constants

- **`visitor`** (const)
  - ScriptVisitor instance
  - Used to transform CST into AST

---

## 5. Transformer & Code Generation

### `transformer.ts`

- **`transformast(ast: CodeNode): GenContextAndCode`**
  - Transforms AST into JavaScript code
  - Returns generated code with source map
  - Main code generation function

- **`createlineindexes(ast: CodeNode)`**
  - Creates line indexes and labels from AST
  - Sets up generation context with label mappings
  - Prepares AST for code generation

- **`write(ast: CodeNode, chunks): SourceNode`**
  - Helper function to create source map nodes
  - Writes code chunks with source location tracking

- **`context`** (const)
  - Generation context object
  - Tracks: labels, internal counter, line index, line lookup, first stat flag

- **`GENERATED_FILENAME`** (const)
  - Filename for generated code: `'zss.js'`

- **`GenContext`** (type)
  - Type for generation context

- **`GenContextAndCode`** (type)
  - Return type for transformast
  - Includes context and code generation results

---

## 6. CST Type Definitions

### `visitortypes.ts`

Exports 100+ Concrete Syntax Tree (CST) node types for the parser grammar. These are auto-generated type definitions for the parser structure.

**Main Categories:**

- **Program Structure:** `ProgramCstNode`, `LineCstNode`, `StmtCstNode`
- **Statements:** `Stmt_labelCstNode`, `Stmt_statCstNode`, `Stmt_textCstNode`
  - `Stmt_commentCstNode`, `Stmt_hyperlinkCstNode`, `Stmt_commandCstNode`
- **Inline Expressions:** `InlineCstNode`, `Inline_goCstNode`, `Inline_tryCstNode`, `Inline_commandCstNode`
- **Control Flow:** `Command_ifCstNode`, `Command_if_blockCstNode`, `Command_blockCstNode`
  - `Command_else_ifCstNode`, `Command_elseCstNode`
  - `Command_whileCstNode`, `Command_repeatCstNode`, `Command_waitforCstNode`
  - `Command_foreachCstNode`, `Command_breakCstNode`, `Command_continueCstNode`
- **Expressions:** `ExprCstNode`, `And_testCstNode`, `Not_testCstNode`, `ComparisonCstNode`
  - `Expr_valueCstNode`, `Arith_exprCstNode`, `TermCstNode`, `FactorCstNode`, `PowerCstNode`
- **Direction:** `DirCstNode` and variants (`Dir_byCstNode`, `Dir_atCstNode`, `Dir_awayCstNode`, etc.)
- **Token Expressions:** `Token_exprCstNode`, `Token_expr_anyCstNode`, `Token_expr_countCstNode`
  - Many token expression variants (blocked, abs, intceil, intfloor, intround, clamp, min, max, pick, random, run, etc.)
- **Tokens:** `TokenCstNode`, `String_tokenCstNode`, `Simple_tokenCstNode`
- **Utility Types:** `WordsCstNode`, `KindCstNode`, `CategoryCstNode`, `ColorCstNode`

Each CST node type has a corresponding `*CstChildren` type defining its child nodes.

- **`ICstNodeVisitor<IN, OUT>`** (interface)
  - Visitor interface for CST nodes
  - Generic visitor pattern interface

---

## Summary by Category

| Category | File | Key Exports |
|----------|------|-------------|
| **Compilation** | `generator.ts` | `compile()` - Main entry point |
| **AST Generation** | `ast.ts` | `compileast()` - AST compilation |
| **Lexer** | `lexer.ts` | `tokenize()`, `LANG_ERROR`, 100+ token constants |
| **Parser** | `parser.ts` | `parser` - Parser instance |
| **AST Types** | `visitor.ts` | `NODE`, `COMPARE`, `OPERATOR`, `LITERAL` enums, `CodeNode` type, `visitor` instance |
| **Code Gen** | `transformer.ts` | `transformast()`, `createlineindexes()`, `write()`, context constants |
| **CST Types** | `visitortypes.ts` | 100+ CST node type definitions, `ICstNodeVisitor` interface |

---

## Usage Flow

1. **`tokenize(text)`** → Tokenizes source text
2. **`parser`** → Parses tokens into CST
3. **`visitor`** → Transforms CST into AST (`CodeNode`)
4. **`transformast(ast)`** → Transforms AST into JavaScript code
5. **`compile(name, text)`** → Orchestrates full compilation pipeline

