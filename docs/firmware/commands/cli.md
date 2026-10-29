---
title: CLI commands
description: Every terminal #command for books, pages, saving, export, multiplayer, chat, permissions, and ZNS.
---

Commands you type in the terminal (`?` or `/` opens it). Many are operator only. Module notes for developers: [cli.ts](/firmware/cli).

## Messaging

### #shortsend

Message (short form, no target keyword needed)

### #send

Message to target elements

### #stat

Text in a scroll window

### #text

Text on element or in sidebar

### #hyperlink

Clickable link in scroll or log

### #help

Help scroll

## Books and pages

### #books

All books

### #pages

All pages in all loaded books

### #boards

All boards as goto hyperlinks

### #bookrename

The main book (operator only)

### #booktrash

A book by address (operator only)

### #boardopen

To move player to board

### #pageopen

A code page editor

### #pagetrash

A code page (operator only)

### #trash

Books/codepages to delete (operator only)

## Session and state

### #dev

Dev mode / halt execution (operator only)

### #share

Share url (operator only)

### #save

And persist current state

### #fork

Tab with copy of state

### #nuke

A countdown and reloads into an empty state (operator only)

### #endgame

Health to 0

### #restart

Software, deletes all chip and player state (operator only)

## Export

### #export

Export menu (operator only)

### #bookexport

Book export options (operator only)

### #bookallexport

Entire book as JSON (operator only)

### #pageexport

Code page as JSON (operator only)

### #itchiopublish

Zip file for itch.io (operator only)

### #memoryfs

Projected MEMORY folder sync: `status` / `detach` (operator only; Chromium folder drop). Sync summaries always log to tape; path detail via `#admin` `memoryfslogging`

## Editing and discovery

### #gadget

Built-in inspector

### #findany

Matched elements

### #zztsearch

ZZT content by field and text

### #zztrandom

Random ZZT content

## Multiplayer

### #admin

Admin scroll (active players, gadget/dev links for operator, multiplayer); config toggles crt, lowrez, scanlines, voice2text, loaderlogging, promptlogging

### #joincode

Multiplayer session (operator only)

### #jointab

New tab with the join url (operator only)

### #sessions

List active multiplayer sessions for this book

## Chat, broadcast, and media

### #chat

Bridge chat: `#chat <channel> [twitchtoken=]` starts Twitch; `#chat say <text>` posts to that channel; `#chat start …` / `#chat stop` (Twitch) or `#chat stop <kind>`; `#chat profile` or `#chat profile list` lists saved bridge profiles; `#chat profile show|save|delete …`

### #bridge

Bridge integrations snapshot: `#bridge` or `#bridge status` (chat slots + broadcast; no secrets) (operator only)

### #broadcast

Stream broadcast: `#broadcast` (platform menu), `#broadcast stop`, `#broadcast stream <peerid>` / `#broadcast ms_…` (media-stream companion bind), `#broadcast <stream-key>` (Twitch WHIP v2), `#broadcast ivs-ll <key>`, `#broadcast ivs-rt <token>`, or `#broadcast whip <url|alias> <bearer>` (operator only; WHIP XOR media-stream)

### #media

Board TV media queue: `#media` (queue list), `#media <url>` (submit), `#media playlist` (copy played + queue URLs)

### #queue

Media helper admin: `#queue` (menu), `#queue <peerid>` (bind), `#queue skip` / `clear` / `stop` / `limit <N>` / `approve <N>` / `reject <N>`

## Permissions

### #permissions

Read-only: base preset, group legend, player→role, per-role effective commands (overrides vs preset), banned tokens

### #access

Set base preset: `lockdown`, `creative`, or `open` (overrides preserved)

### #allow

Grant a permission family for a role (`admin` / `mod` / `player`); use a family name or any command that maps to that family

### #revoke

Revoke a family relative to the preset for a role (or undo a prior `allow`)

### #role

Assign role for a player id

### #ban

Ban player by id (session token; blocks login) or list active players

### #unban

Unban player by id or list banned tokens

## Tools

### #userinput

Inject player input (`up` / `down` / `left` / `right` / `ok` / `cancel` / `shoot*`…)

### #screenshot

Screenshot for capture

### #zns

Login/publish actions
