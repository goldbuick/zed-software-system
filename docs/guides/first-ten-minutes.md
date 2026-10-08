---
title: Your first ten minutes
description: Open zed.cafe, find your way around the terminal, load a starter kit, and look inside a book.
---

By the end of this guide you will know how to open the command line, read the built-in help, load a starter kit, and see the pages inside a book.

## Open the terminal

Go to [zed.cafe](https://zed.cafe/). A fresh session has no content yet, so the terminal opens on its own and prints three things:

- a `no content found` notice (this is expected on a first visit)
- a list of **starter kits** (the `stk list`)
- the hint `try typing #help and pressing enter!`

The terminal is the command line, or CLI. Almost everything in Zed Cafe starts here.

| Key | What it does |
|-----|--------------|
| `?` or `/` | Open the CLI |
| `#` | Open the CLI with `#` already typed, ready for a command |
| `@` | Open the CLI with `@` already typed, ready to make a page |
| `C` | Open quick chat (it closes after Enter) |
| `esc` | Close the CLI, a scroll, or the editor |
| `tab` | Change the layout |
| up / down arrows | Move between CLI lines |
| enter | Run the selected line, or follow a link |

:::note
Lines in the terminal can be links. Move onto one with the arrow keys and press Enter, or click it. Many links also show a one-letter hotkey such as ` C `. Pressing that key follows the link.
:::

## Read the help

1. **Run #help**

    Press `#`, type `help`, and press Enter. A help scroll opens.

2. **Look at the controls**

    Select **read help on controls** (hotkey `C`). Arrow keys move you. Shift plus an arrow key, or `w a s d`, shoots. `z x c v` are the A / B / X / Y buttons. Game controllers work too.

3. **Look at books and pages**

    Go back, then select **Developer - books & pages** (hotkey `3`). This short list is the map for the rest of these guides: `#books`, `#pages`, `#boards`, `@page name`, `#save`, and `#share`.

4. **Close the scroll**

    Press `esc`.

## Load a starter kit

A starter kit is a book that comes with useful pages already made. The guides use **ZTK - ZZT Tool Kit**. It brings a player, terrain like `solid`, `normal`, `breakable`, and `water`, and items like `key`, `door`, `scroll`, and `passage`. Every piece works like its ZZT counterpart.

1. **Pick ZTK from the starter kit list**

    In the terminal's `stk list`, select **ZTK - ZZT Tool Kit**. If the list has scrolled away, open [bytes.zed.cafe/geNHhyjf](https://bytes.zed.cafe/geNHhyjf) directly.

2. **Wait for it to load**

    The page reloads with the kit's book in memory.

:::tip
The other kits in the list are worth a look later. **QK - Quick Kit** is a smaller toolkit. **Simple Chat** and the **TTS** demos show off multiplayer chat and text-to-speech.
:::

## Look inside the book

Run these one at a time. Each one prints its results into the terminal.

```text
#books
#pages
#boards
```

- `#books` lists every book in memory. One book is the **opened** book. New pages go there.
- `#pages` lists every page, with its type. Select one to open it.
- `#boards` lists only boards. Select one to go there.

Now open the player's code:

```text
#pageopen player
```

The code editor opens. This page decides how the player moves, shoots, and draws its sidebar. You do not need to understand it yet. Notice its shape:

- lines that start with `@` are **stats** (`@char 2`, `@color white`)
- lines that start with `:` are **labels**, places where code starts running (`:think`, `:shot`)
- lines that start with `#` are **commands** (`#set health 100`, `#shoot inputmove`)
- lines that start with `'` are comments

Press `esc` to close the editor without changing anything.

## Try a command on the world

If you are standing on a board, the CLI can change it while the game runs. Try:

```text
#put north red solid
```

A red wall appears just north of you. `#put` takes a direction and a kind. The kind here is `solid`, with a color word in front. The direction can be `north`, `south`, `east`, or `west`. Kinds come from the book's pages, which is why loading a kit first matters.

## Save your session

```text
#save
```

`#save` writes the current state to your browser's storage, so a reload keeps your work.

## What you learned

- The terminal is the CLI. Open it with `?`, `#`, or `@`. Close it with `esc`.
- `#help` gives you controls and developer basics.
- A starter kit is a book of ready-made pages. ZTK gives you ZZT-style building blocks.
- `#books`, `#pages`, `#boards`, and `#pageopen` let you explore a book.

Next: [Your first board](/guides/first-board).
