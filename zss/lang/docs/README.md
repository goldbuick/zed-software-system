# Lang Documentation

The lang system provides the compiler pipeline for the ZSS scripting language — the language used in codepages and game logic. Source text is tokenized, parsed, transformed into an AST, and then compiled to JavaScript that runs against the CHIP API.

## Architecture Overview

The compilation pipeline has four stages:

1. **Lexer** — Tokenizes source text (labels, commands, text, literals, operators, etc.)
2. **Parser** — Builds a Concrete Syntax Tree (CST) from tokens via Chevrotain
3. **Visitor** — Transforms CST into an Abstract Syntax Tree (AST) of `CodeNode`s
4. **Transformer** — Converts AST into JavaScript with source maps

The main entry point is `compile()` in `generator.ts`, which orchestrates the full pipeline and returns executable code or errors.

## Module Index

| File | Purpose |
|------|---------|
| [ast.md](ast.md) | AST compilation entry point (`compileast`) |
| [generator.md](generator.md) | Full compilation pipeline (`compile`) |
| [lexer.md](lexer.md) | Tokenization and token definitions |
| [parser.md](parser.md) | CST grammar and parsing rules |
| [transformer.md](transformer.md) | AST → JavaScript code generation |
| [visitor.md](visitor.md) | CST → AST visitor and node types |
| [visitortypes.md](visitortypes.md) | CST node type definitions |

## Pipeline Flow

```
source text
    → tokenize (lexer)
    → parser.program() (parser)
    → visitor.go(cst) (visitor)
    → transformast(ast) (transformer)
    → new Function('api', code) (generator)
    → GeneratorFunc
```

## Dependencies

- **chevrotain** — Lexer and parser framework
- **source-map** — Source map generation for stack traces
- **zss/chip** — CHIP type for execution context
- **zss/words/textformat** — Template string tokenization (`$name` interpolation)
