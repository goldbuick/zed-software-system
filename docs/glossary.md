---
title: Glossary
description: Shared Zed Cafe vocabulary — short definitions, cross-links, and where to read more.
sidebar:
  order: 2
---

Creator-facing terms for boards, books, `#command`s, and the terminal.

**Jump:** [B](#b) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [J](#j) · [K](#k) · [L](#l) · [M](#m) · [O](#o) · [P](#p) · [R](#r) · [S](#s) · [T](#t) · [W](#w) · [Z](#z)

## B

### bgplay

`#bgplay` plays a short sound-effect pattern on the background synth voices (same notation family as [play](#play)).

Related: [play](#play) · [command](#command)

See: [Synth](/synth) · [Notation](/synth/playnotation)

### board

A playable 60×25 room: terrain, objects, exits, and camera. You walk boards; `#boards` lists them.

Related: [board page](#board-page) · [board element](#board-element) · [book](#book) · [exit](#exit)

See: [Your first board](/guides/first-board)

### board element

One occupant of a board cell — kind, char, color, collision, cycle, and params like [p1–p20](#p1p20). Same idea as [element](#element).

Related: [kind](#kind) · [chip](#chip) · [collision](#collision)

### board page

A [code page](#code-page) that stores a [board](#board) layout inside a [book](#book).

Related: [object page](#object-page) · [terrain page](#terrain-page)

### book

A container of [code page](#code-page)s (boards, objects, terrain, and more). One book is **opened**; new pages go there. `#books` lists them.

Related: [MEMORY](#memory) · [page](#page)

See: [Your first ten minutes](/guides/first-ten-minutes)

## C

### cafe

The Vite/React app shell at zed.cafe that hosts the [Engine](#engine) and [tape](#tape) UI.

Related: [ZED Cafe](#zed-cafe) · [ZSS](#zss)

### charset page

A [code page](#code-page) of custom character glyphs used when drawing the board.

Related: [palette page](#palette-page) · [CRT](#crt)

### chip

The per-element script runner: compiled ZSS, stats, firmware `#command`s, and messages between objects.

Related: [firmware](#firmware) · [label](#label) · [send](#send)

See: [Firmware](/firmware)

### CLI driver

Where terminal `#` input runs. Permission checks apply here (unlike loader / runtime).

Related: [firmware](#firmware) · [tape](#tape) · [command](#command)

### code page

An editable unit inside a [book](#book): board, object, terrain, charset, palette, loader, or txt.

Related: [board page](#board-page) · [object page](#object-page)

### collision

How elements bump: walk, solid, swim, bullet, ghost, and related words used in scripts and the inspector.

Related: [kind](#kind) · [DIR](#dir)

See: [Words — collision](/words/collision)

### color

The 16 foreground colors (plus ON / blink variants) used for chars and `#color`.

Related: [palette page](#palette-page)

See: [Words — color](/words/color)

### command

A hash-prefixed firmware action in the terminal or on a code page — `#goto`, `#play`, `#put`, and the rest.

Related: [firmware](#firmware) · [CLI driver](#cli-driver)

See: [All commands](/firmware#all-commands)

### creative

An `#access` preset: players can explore, code, build, and speak. Persist, bridge, moderation, and roles stay restricted.

Related: [lockdown](#lockdown) · [open](#open) · [operator](#operator)

### CRT

The retro monitor look — post-process effects on the fantasy display.

Related: [Engine](#engine) · [gadget](#gadget)

### cycle

How often a chip wakes (1–255). Lower cycle means the object runs more often.

Related: [chip](#chip) · [halt](#halt)

## D

### DIR

Direction vocabulary for movement and targeting: N/S/E/W, SEEK, FLOW, BY, WITHIN, and friends.

Related: [collision](#collision) · [command](#command)

See: [Words — dir](/words/dir)

## E

### element

Something placed on a [board](#board): terrain fills the floor and walls; objects sit on top and can run code. In source this is often a [board element](#board-element).

Related: [kind](#kind) · [object page](#object-page) · [terrain page](#terrain-page)

### Engine

The React root that boots the platform and draws the R3F terminal scene.

Related: [cafe](#cafe) · [gadget](#gadget)

### exit

A board edge link (`@exiteast`, `@exitwest`, and the other compass exits). Walking off that edge goes to the named [board](#board).

Related: [board](#board) · [board page](#board-page)

See: [Your first board](/guides/first-board)

## F

### fantasy terminal

The product metaphor: boards as worlds, `#command`s as the OS, scrolls as help, tape as the CLI.

Related: [tape](#tape) · [scroll](#scroll) · [ZED Cafe](#zed-cafe)

### firmware

The registry of `#command`s and hooks, composed into CLI, loader, and runtime drivers.

Related: [command](#command) · [chip](#chip)

See: [Firmware](/firmware)

### flag

A named value on a book, element, or player — script state you `#set` and `#if`.

Related: [MEMORY](#memory) · [chip](#chip)

## G

### gadget

The render / UI projection of the world: layers, scrolls, per-player view. `#gadget` toggles the inspector overlay.

Related: [inspector](#inspector) · [layer](#layer) · [tape](#tape)

## H

### halt

Dev stop for chip execution (`#dev`) until cleared.

Related: [cycle](#cycle) · [operator](#operator)

### hyperlink

A choice line inside a [scroll](#scroll): `!label;visible text`. Picking it runs that [label](#label) on the object.

Related: [scroll](#scroll) · [label](#label) · [message](#message)

See: [Your first object](/guides/first-object)

## I

### inspector

Visual edit mode (`#gadget`): pick cells, change stats, copy, find-any, remix.

Related: [gadget](#gadget) · [STAT_TYPE](#stat_type)

See: [Your first board](/guides/first-board)

### itch.io

Publish a build with `#itchiopublish` (operator).

Related: [ZNS](#zns) · [book](#book)

## J

### joincode

Operator starts a multiplayer session and shares a join URL (`#joincode`).

Related: [operator](#operator) · [role](#role)

## K

### kind

The type name of an element — used in `#put`, `#become`, collision, and lookup (`player`, `solid`, `lamp`, …).

Related: [object page](#object-page) · [board element](#board-element)

See: [Words — kind](/words/kind)

## L

### label

A named block in object code (`:touch`, `:shot`, or your own). Messages and links jump here.

Related: [chip](#chip) · [send](#send)

See: [Your first object](/guides/first-object)

### layer

A draw plane in the gadget: tiles, sprites, dither, media, control, and blank.

Related: [gadget](#gadget)

### loader page

A [code page](#code-page) that runs when importing external files (text, JSON, binary, media).

Related: [LOADER driver](#loader-driver) · [firmware](#firmware)

See: [Loader](/firmware/loader)

### LOADER driver

Firmware context for import handlers — no permission checks.

Related: [CLI driver](#cli-driver) · [RUNTIME driver](#runtime-driver)

### lockdown

An `#access` preset: tight build/speaker rules; players get no controlled permission groups.

Related: [creative](#creative) · [open](#open)

## M

### makeit scroll

The [scroll](#scroll) that opens when you type `@` plus a page name. It lists create and edit links for that name.

Related: [scroll](#scroll) · [page](#page) · [object page](#object-page)

See: [Your first object](/guides/first-object)

### MEMORY

The live game state root: books, session, loaders, operator. The sim owns it; join tabs project a view.

Related: [book](#book) · [board](#board)

See: [Memory](/memory)

### message

How objects talk: `name:label` from the CLI, or `#name:label` from code, runs that [label](#label) on matching elements. Built-ins include `:touch`.

Related: [send](#send) · [label](#label) · [chip](#chip)

See: [Your first object](/guides/first-object)

## O

### object page

A [code page](#code-page) that defines reusable object behavior bound by [kind](#kind) name.

Related: [chip](#chip) · [board element](#board-element)

See: [Your first object](/guides/first-object)

### open

An `#access` preset: almost everything allowed for every role; risk still needs `#allow` or operator.

Related: [lockdown](#lockdown) · [creative](#creative)

### operator

The privileged session player — bypasses permission checks.

Related: [role](#role) · [joincode](#joincode)

## P

### p1–p20

Generic numeric slots on a [board element](#board-element) for custom object state.

Related: [flag](#flag) · [chip](#chip) · [stat](#stat)

### page

Everyday name for a [code page](#code-page) inside a [book](#book) — board, object, terrain, loader, palette, charset, or txt.

Related: [code page](#code-page) · [book](#book)

### palette page

A [code page](#code-page) that remaps board colors.

Related: [color](#color) · [charset page](#charset-page)

### play

`#play` schedules melody on the main synth voices. Digits in the string are drums, not octaves — see [Notation](/synth/playnotation).

Related: [bgplay](#bgplay) · [command](#command)

See: [Synth](/synth) · [Notation](/synth/playnotation)

### player

The login [kind](#kind) / object you control. Starter kits ship an object page named `player`.

Related: [kind](#kind) · [object page](#object-page) · [operator](#operator)

## R

### role

Assignable identity (admin, mod, player) with permission grants (`#role`).

Related: [operator](#operator) · [lockdown](#lockdown)

### ROM

Built-in help markdown: refscrolls, editor hints, command docs.

Related: [scroll](#scroll) · [command](#command)

### RUNTIME driver

Firmware context when codepage chips run on a board.

Related: [CLI driver](#cli-driver) · [chip](#chip)

## S

### scroll

An in-world text panel — help, lists, [hyperlink](#hyperlink)s, choices. Not the same as the [tape](#tape) CLI. One plain text line is usually a [ticker](#ticker); two or more open a scroll.

Related: [ROM](#rom) · [label](#label) · [toast](#toast)

See: [Gadget scrolls](/gadget/gadget-scrolls)

### send

A message from one element (or the player) to a [label](#label) or target — the event bus for objects. Players usually say [message](#message).

Related: [chip](#chip) · [label](#label) · [message](#message)

See: [Words — send](/words/send)

### starter kit

A ready-made [book](#book) listed on a fresh session (Quick Start Kit, ZZT Tool Kit, and others). Loading one puts pages into MEMORY so you can play or edit immediately.

Related: [book](#book) · [board](#board)

See: [Your first ten minutes](/guides/first-ten-minutes)

### stat

An `@` field on a page that sets looks or board data — `@char`, `@color`, `@exiteast`, `@startx`, and friends. Different from a [flag](#flag), which is runtime `#set` state.

Related: [object page](#object-page) · [exit](#exit) · [STAT_TYPE](#stat_type)

### STAT_TYPE

Inspector / editor categories for stats: board, object, range, hotkey, charedit, and more.

Related: [inspector](#inspector) · [stat](#stat)

See: [Words — stats](/words/stats)

## T

### tape

The terminal input line and code-editor panel (layout modes top / full / bottom / max).

Related: [CLI driver](#cli-driver) · [fantasy terminal](#fantasy-terminal)

### terrain page

A [code page](#code-page) of background tile kinds for the board terrain layer.

Related: [board page](#board-page) · [kind](#kind)

### ticker

One line of text at the bottom of the view. A single plain line from an object usually shows as a ticker; `$ticker ...` forces that line there.

Related: [scroll](#scroll) · [toast](#toast)

See: [Your first object](/guides/first-object)

### toast

A short pop-up message (`$toast ...`).

Related: [ticker](#ticker) · [scroll](#scroll)

See: [Your first object](/guides/first-object)

### TTS

Text-to-speech (`#tts`, `#ttsengine`) via Piper, Supertonic, or Fish.

Related: [command](#command) · [Synth](/synth)

See: [TTS](/feature/tts)

### txt page

A plain-text notes [code page](#code-page) (`@txt name`). No ZSS execution; ZNS can render markdown and `$` colors.

Related: [ZNS](#zns) · [book](#book)

## W

### words

Shared parsers and enums — color, dir, kind, collision, stats — that firmware and scripts share.

Related: [DIR](#dir) · [color](#color) · [kind](#kind)

See: [Words](/words)

## Z

### ZED Cafe

The product at [zed.cafe](https://zed.cafe/) — fantasy terminal worlds, and the ZSS dialect that extends ZZT-OOP.

Related: [cafe](#cafe) · [fantasy terminal](#fantasy-terminal)

### ZNS

Zed Name Service — publish and list shareable content (`#zns`).

Related: [book](#book) · [itch.io](#itchio)

### ZSS

Zed Software System — the TypeScript monolith: cafe UI, engine, firmware, and CLI.

Related: [firmware](#firmware) · [MEMORY](#memory)

### ZZT Museum

Browse classic ZZT worlds with `#zztsearch` / `#zztrandom`.

Related: [book](#book) · [command](#command)
