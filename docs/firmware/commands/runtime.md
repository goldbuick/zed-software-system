---
title: Runtime commands
description: The #commands codepages can use while boards run, beyond the shared element, board, and audio commands.
---

Commands available to codepages during play (runtime driver). The shared [element, board, transform, network, and audio commands](/firmware/commands) work here too. Module notes for developers: [runtime.ts](/firmware/runtime).

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

## Lifecycle and help

### #endgame

Health to 0

### #help

Help scroll
