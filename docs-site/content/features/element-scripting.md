---
title: Element scripting
description: Element scripting features in Zed Cafe / ZSS.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| #go / #walk / #idle | Creator | Move element, continuous walk, or yield tick. | `#go` |
| #become / #bind | Creator | Transform kind or copy code from named element. | `#become` |
| #set / #clear / #array | Creator | Variable and array state on element. | `#set` |
| #run / #runwith | Creator | Invoke object codepage by name with optional arg. | `#run` |
| #die / #zap / #restore | Creator | Lifecycle: delete element, deactivate label, restore labels. | `#die` |
| #lock / #unlock | Creator | Block or allow external messages during execution. | `#lock` |
| #cycle | Creator | Set element tick rate divisor 1–255. | `#cycle` |
| #char / #color | Creator | Set display char/color on self or at direction. | `#char` |
| #toast / #ticker | Creator | UI toast notification or sidebar ticker text. | `#toast` |
