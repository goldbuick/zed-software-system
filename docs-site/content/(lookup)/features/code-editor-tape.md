---
title: Code editor & tape
description: Code editor & tape features in Zed Cafe / ZSS.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| Tape layout modes | Creator | TOP, FULL, BOTTOM, MAX — resize terminal/editor split. | `Tab / layout keys` |
| Command autocomplete | Creator | Lexer-driven # command and word-list suggestions. | `zss/screens/tape/autocomplete.ts` |
| Parse error messages | Creator | Chevrotain errors rewritten to short hints in editor and compile tape. | [`formatlangerror`](/lang/formatlangerror) |
| ROM command hints | Creator | Long-form help from editor:commands:<name> markdown. | `zss/screens/tape/commandarghints.ts` |
| Collaborative editing | Both | Yjs CRDT sync with cursor/selection awareness. | `zss/device/modem.ts` |
| Editor bookmarks | Creator | Save/run CLI lines, snippets, and URLs. | `#bookmark scroll handlers` |
| Syntax highlighting | Creator | Tape editor highlights ZSS lang tokens and stats. | `zss/screens/editor/` |
