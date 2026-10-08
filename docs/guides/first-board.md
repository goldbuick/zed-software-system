---
title: Your first board
description: Create two connected boards, build walls with commands and the inspector, then save and share the result.
---

In this guide you build two small rooms, connect them with an exit, and share a link to them. It assumes you have finished [Your first ten minutes](/guides/first-ten-minutes) and have the **ZTK** kit loaded.

## Create a board

1. **Make the page**

    Press `@`, type `board hallway`, and press Enter.

    This is the **make-it** command: `@` plus a page type and a name. A small scroll opens with a link that reads **create @board hallway**. If you loaded more than one book, it also shows a book picker. Pick the book you want the board in.

2. **Select create**

    Select **create @board hallway**. Zed Cafe makes the board page and moves you to the middle of the new, empty board.

:::tip
Use one-word names for boards and objects while you learn, such as `hallway` instead of `the hallway`. Names with spaces work, but they need quotes in some commands.
:::

The same `@` command makes any page type: `@object lamp`, `@terrain lava`, `@loader greeter`, and so on. If you type only a name (`@lamp`), the scroll offers one create link for each page type.

## Place some walls

Use the CLI to put terrain next to you. Each command places one cell in a direction from where you stand:

```text
#put north white solid
#put west white solid
#put south white solid
```

Walk with the arrow keys and repeat to sketch the outline of a room. You can also try other ZTK terrain:

```text
#put east normal
#put east breakable
#put east water
```

Placing walls one at a time is slow. The inspector makes it faster.

## Copy and tile with the inspector

The **inspector** (also called the gadget) lets you select cells on the board and edit them with the mouse.

1. **Turn it on**

    Run `#gadget`. Moving the mouse over the board now shows a cursor on each cell.

2. **Inspect one cell**

    Click a wall you placed. A scroll lists that element's details: its kind, collision, and links to change its **char**, **color**, and **bg** (background). Change the color and watch the wall update live.

3. **Copy a pattern**

    Put two walls next to each other. Then press on one, drag across both, and let go. The area scroll that opens has **copy elements**. Select it.

4. **Tile it across a region**

    Drag across a long empty strip where you want a wall. In the area scroll, select **paste**, then **paste terrain tiled**. The copied pattern repeats to fill the whole selection.

5. **Turn it off**

    Run `#gadget` again to leave the inspector.

The area scroll also has **cut**, **make empty**, **set chars**, **set colors**, **set bgs**, a **style** brush, and **remix**. Try them on a copy of your room. Remix fills a region with new patterns based on what is already there.

:::note
The inspector and the CLI are two ways to do the same job. Anything you do in the inspector, a command can also do (`#put`, `#write`, `#copy`, `#remix`). That means you can script your edits later.
:::

## Edit the board's stats

A board is a page too, and its page holds stats that control the room. Open it:

```text
#pageopen hallway
```

The editor opens with one line, `@board hallway`. Add a start position below it:

```text
@board hallway
@startx 5
@starty 12
```

`@startx` and `@starty` set where a player appears when they arrive without a set position. The board is 60 cells wide (x from 0 to 59) and 25 tall (y from 0 to 24). Press `esc` to close the editor. Your edits are already saved to the page.

## Add a second room and connect them

1. **Create the second board**

    Press `@`, type `board cellar`, and select **create @board cellar**. You are now in the empty cellar.

2. **Add an exit from the hallway**

    Run `#pageopen hallway` and add an exit line:

    ```text
    @board hallway
    @startx 5
    @starty 12
    @exiteast cellar
    ```

3. **Add the way back**

    Run `#pageopen cellar` and add:

    ```text
    @board cellar
    @exitwest hallway
    ```

4. **Walk through**

    Run `#boards` and select **hallway** to go back. Walk off the east edge of the board. You arrive in the cellar. Walk off its west edge to return.

There are four exits: `@exitnorth`, `@exitsouth`, `@exiteast`, and `@exitwest`. An exit can name a board in your book. It can also be a join URL or a `https://bytes.zed.cafe/...` content link, which takes the player to a different world.

To jump to any board while you build, use `#boardopen <name>` or select it from `#boards`.

## Save and share

```text
#save
#share
```

- `#save` writes your current state to the browser, so a reload keeps it.
- `#share` makes a link you can click to copy, plus a QR code. Anyone who opens the link gets a copy of your world.

For more export options, such as downloading a book as JSON, run `#export`.

## What you learned

- `@board name` creates a board and takes you there. `@` works for every page type.
- `#put <direction> <kind>` places one element. Color words like `red` or `white` go in front of the kind.
- `#gadget` toggles the inspector. Use it to select, recolor, copy, tile-paste, and remix.
- Board stats such as `@startx`, `@starty`, and `@exiteast` live on the board's page. Edit them with `#pageopen`.
- `#save` keeps your work. `#share` hands it to someone else.

Next: [Your first object](/guides/first-object).
