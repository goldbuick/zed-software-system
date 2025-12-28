# Screens Module - Exported Functions Summary

This document categorizes and summarizes all exported functions, types, constants, and components from the `screens` module.

## 1. Main Screen Components

### `tape/component.tsx`

- **`Tape()`**
  - Main tape/terminal container component
  - Manages terminal layout (TOP, BOTTOM, FULL)
  - Handles terminal open/close state and quick terminal mode
  - Wraps TapeLayout with focus and hotkey management

### `screenui/component.tsx`

- **`ScreenUI()`**
  - Main screen UI coordinator component
  - Manages screen layout with sidebar and scroll panels
  - Handles landscape/portrait orientations
  - Coordinates multiple UI panels (scroll, sidebar, touch controls)

---

## 2. Panel Components

### `panel/component.tsx`

- **`Panel(props: PanelProps)`**
  - Main panel container component
  - Renders interactive panel items with scrolling
  - Supports inline mode, margins, selection highlighting

### `panel/panelitem.tsx`

- **`PanelItem(props: PanelItemProps)`**
  - Generic panel item wrapper component
  - Handles item rendering with active/inactive states

### `panel/common.ts`

- **`PanelItemProps`** (type)
  - Props for panel items: sidebar, player, chip, row, active, label, args, context

- **`ScrollContext`** (const - React Context)
  - Context for scroll panel communication
  - Methods: sendmessage, sendclose, didclose

- **`theme`** (const)
  - Theme configuration object with input colors (color, active)

- **`inputcolor(active: boolean)`**
  - Returns appropriate input color based on active state

- **`chiptarget(chip: string, target: string)`**
  - Creates chip target string with VM routing prefix: `vm:${chip}:${target}`

- **`strsplice(source: string, index: number, removecount?: number, insert?: string)`**
  - String manipulation utility: inserts/removes text at specified index

- **`setuppanelitem(sidebar: boolean, y: MAYBE<number>, context: WRITE_TEXT_CONTEXT)`**
  - Sets up text context for panel item rendering

#### Panel Item Components

- **`panel/text.tsx`**
  - `PanelItemText(props)` - Text display panel item

- **`panel/number.tsx`**
  - `PanelItemNumber(props)` - Number input panel item

- **`panel/range.tsx`**
  - `PanelItemRange(props)` - Range/slider input panel item

- **`panel/select.tsx`**
  - `PanelItemSelect(props)` - Select/dropdown panel item

- **`panel/charedit.tsx`**
  - `PanelItemCharEdit(props)` - Character editor panel item

- **`panel/coloredit.tsx`**
  - `PanelItemColorEdit(props)` - Color picker panel item

- **`panel/zssedit.tsx`**
  - `PanelItemZSSEdit(props)` - ZSS code editor panel item

- **`panel/hyperlink.tsx`**
  - `PanelItemHyperlink(props)` - Hyperlink panel item

- **`panel/hotkey.tsx`**
  - `PanelItemHotkey(props)` - Hotkey display/input panel item

- **`panel/runit.tsx`**
  - `PanelItemRunIt(props)` - Run/execute action panel item

- **`panel/copyit.tsx`**
  - `PanelItemCopyIt(props)` - Copy action panel item

- **`panel/openit.tsx`**
  - `PanelItemOpenIt(props)` - Open action panel item

- **`panel/viewit.tsx`**
  - `PanelItemViewIt(props)` - View action panel item

- **`panel/content.tsx`**
  - `PanelItemContent(props)` - Generic content display panel item

---

## 3. Terminal Components

### `terminal/component.tsx`

- **`TapeTerminal()`**
  - Main terminal component
  - Manages terminal logs, input, and layout
  - Handles voice-to-text configuration
  - Renders terminal rows and input area

### `terminal/terminalrows.tsx`

- **`TerminalRows()`**
  - Renders terminal log rows
  - Displays terminal history/messages

### `terminal/item.tsx`

- **`TapeTerminalItem(props: TapeTerminalItemProps)`**
  - Individual terminal log item component
  - Displays terminal message text

- **`TapeTerminalActiveItem(props)`**
  - Active/focused terminal item component

### `terminal/input.tsx`

- **`TapeTerminalInput(props: TapeTerminalItemInputProps)`**
  - Terminal input component
  - Handles command input with prefix, label, and blinking cursor

### `terminal/common.ts` (from `tape/common.ts`)

- **`TapeTerminalContext`** (const - React Context)
  - Context for terminal message sending
  - Method: sendmessage(target, data)

- **`TapeTerminalItemProps`** (type)
  - Props: active?, text, y

- **`TapeTerminalItemInputProps`** (type)
  - Props: blink?, active?, prefix, label, words, y

### Terminal Action Components

- **`terminal/runit.tsx`**
  - `TapeTerminalRunIt(props)` - Run action in terminal

- **`terminal/copyit.tsx`**
  - `TapeTerminalCopyIt(props)` - Copy action in terminal

- **`terminal/openit.tsx`**
  - `TapeTerminalOpenIt(props)` - Open action in terminal

- **`terminal/viewit.tsx`**
  - `TapeTerminalViewIt(props)` - View action in terminal

- **`terminal/hyperlink.tsx`**
  - `TapeTerminalHyperlink(props)` - Hyperlink in terminal

---

## 4. Editor Components

### `editor/component.tsx`

- **`TapeEditor()`**
  - Main code editor component
  - Handles syntax highlighting, code parsing, and compilation
  - Manages editor state, cursor position, and error display

### `editor/editorrows.tsx`

- **`EditorRowsProps`** (type)
  - Props for editor rows component

- **`EditorRows(props: EditorRowsProps)`**
  - Renders editor code rows with syntax highlighting
  - Displays line numbers and code content

### `editor/editorinput.tsx`

- **`EditorInputProps`** (type)
  - Props for editor input component

- **`EditorInput(props: EditorInputProps)`**
  - Editor input/command line component
  - Handles code input and editing

### `editor/editorframe.tsx`

- **`EditorFrame()`**
  - Editor frame/wrapper component
  - Provides editor container UI

### `editor/colors.tsx`

#### Syntax Highlighting Constants

- **`ZSS_TYPE_NONE`** - Default text color (WHITE)
- **`ZSS_TYPE_TEXT`** - Text color (GREEN)
- **`ZSS_TYPE_SYMBOL`** - Symbol color (YELLOW)
- **`ZSS_TYPE_COMMENT`** - Comment color (CYAN)
- **`ZSS_TYPE_COMMAND`** - Command color (DKGREEN)
- **`ZSS_TYPE_BLOCK`** - Block color (DKCYAN)
- **`ZSS_TYPE_MUSIC`** - Music color (GREEN)
- **`ZSS_TYPE_STATNAME`** - Stat name color (DKPURPLE)
- **`ZSS_TYPE_NUMBER`** - Number color (WHITE)
- **`ZSS_TYPE_LINE`** - Line color (LTGRAY)
- **`ZSS_TYPE_ERROR`** - Error color (DKGRAY)
- **`ZSS_TYPE_ERROR_LINE`** - Error line color (DKRED)
- **`ZSS_TYPE_LABEL`** - Label color (DKRED)
- **`ZSS_TYPE_FLAGMOD`** - Flag modifier color (DKYELLOW)

- **`ZSS_COLOR_MAP`** (const)
  - Map of token types to colors for syntax highlighting

#### Word Color Constants

- **`ZSS_WORD_MESSAGE`** - Message word color (DKPURPLE)
- **`ZSS_WORD_FLAG`** - Flag word color (DKYELLOW)
- **`ZSS_WORD_STAT`** - Stat word color (DKPURPLE)
- **`ZSS_WORD_KIND`** - Kind word color (CYAN)
- **`ZSS_WORD_KIND_ALT`** - Kind alt color (DKCYAN)
- **`ZSS_WORD_COLOR`** - Color word color (RED)
- **`ZSS_WORD_DIR`** - Direction word color (WHITE)
- **`ZSS_WORD_DIRMOD`** - Direction modifier color (LTGRAY)
- **`ZSS_WORD_EXPRS`** - Expression word color (YELLOW)

#### Word Color Functions

- **`zsswordcolorconfig(word: string, color: COLOR)`**
  - Configures custom color for a specific word

- **`zsswordcolor(word: string): COLOR | COLOR[]`**
  - Gets color(s) for a word, including special handling for 'play' and 'bgplay' commands
  - Returns array of colors for play commands

#### Music Color Constants

- **`ZSS_MUSIC_NOTE`** - Music note color (GREEN)
- **`ZSS_MUSIC_REST`** - Music rest color (DKGREEN)
- **`ZSS_MUSIC_DRUM`** - Music drum color (PURPLE)
- **`ZSS_MUSIC_TIME`** - Music time color (DKCYAN)
- **`ZSS_MUSIC_TIMEMOD`** - Music time modifier color (CYAN)
- **`ZSS_MUSIC_OCTAVE`** - Music octave color (YELLOW)
- **`ZSS_MUSIC_PITCH`** - Music pitch color (DKYELLOW)

#### Music Color Functions

- **`zssmusiccolorconfig(music: string, color: COLOR)`**
  - Configures custom color for music token

- **`zssmusiccolor(music: string): COLOR`**
  - Gets color for music token

---

## 5. Tape Components

### `tape/layout.tsx`

- **`TapeLayout(props)`**
  - Layout component for tape/terminal display
  - Manages editor/terminal split and positioning

### `tape/backplate.tsx`

- **`BackPlate(props: { bump?: boolean })`**
  - Background plate component for tape display
  - Provides visual background/decoration

### `tape/blinker.tsx`

- **`Blinker(props: BlinkerProps)`**
  - Blinking cursor/indicator component
  - Props: x, y, color, on (on color), off (off color), alt?

### `tape/common.ts`

#### Constants

- **`BKG_PTRN`** - Background pattern code (250)
- **`BKG_PTRN_ALT`** - Alternate background pattern code (249)
- **`FG`** - Foreground color (BLUE)
- **`FG_SELECTED`** - Selected foreground color (WHITE)
- **`BG_SELECTED`** - Selected background color (DKGRAY)
- **`BG_ACTIVE`** - Active background color (BLACK)

#### Functions

- **`bgcolor(quickterminal: boolean)`**
  - Returns background color based on terminal mode

- **`editorsplit(width: number)`**
  - Calculates editor split position (50% of width)

#### Types

- **`TapeTerminalItemProps`** (type)
  - Props: active?, text, y

- **`TapeTerminalItemInputProps`** (type)
  - Props: blink?, active?, prefix, label, words, y

- **`EDITOR_CODE_ROW`** (type)
  - Code row structure: start, code, end, errors?, tokens?, asts?

#### Context

- **`TapeTerminalContext`** (const - React Context)
  - Terminal context with sendmessage method

#### Utility Functions

- **`logitemy(offset: number, context: WRITE_TEXT_CONTEXT)`**
  - Calculates Y position for log item

- **`setuplogitem(active: boolean, x: number, y: number, context: WRITE_TEXT_CONTEXT)`**
  - Sets up text context for log item rendering

- **`setupeditoritem(blink: boolean, active: boolean, x: number, y: number, context: WRITE_TEXT_CONTEXT, xmargin: number, topmargin: number, bottommargin: number)`**
  - Sets up text context for editor item rendering

- **`splitcoderows(code: string): EDITOR_CODE_ROW[]`**
  - Splits code string into rows with position tracking

- **`findmaxwidthinrows(rows: EDITOR_CODE_ROW[]): number`**
  - Finds maximum width among code rows

- **`findcursorinrows(cursor: number, rows: EDITOR_CODE_ROW[]): number`**
  - Finds row index containing cursor position

---

## 6. Scroll Components

### `scroll/component.tsx`

- **`Scroll(props: ScrollProps)`**
  - Scrollable content panel component
  - Manages scrollable text content with viewport
  - Props: width, height, color, bg, text, shouldclose, didclose?

### `scroll/controls.tsx`

- **`ScrollControls(props)`**
  - Scroll control buttons/UI component
  - Provides scroll navigation controls

### `scroll/backplate.tsx`

- **`ScrollBackPlate(props)`**
  - Background plate for scroll panel

### `scroll/marquee.tsx`

- **`Marquee(props)`**
  - Marquee/scrolling text component
  - Displays scrolling text animation

---

## 7. ScreenUI Components

### `screenui/framed.tsx`

- **`Framed(props: FramedProps)`**
  - Framed UI container component
  - Props: width, height

### `screenui/tickertext.tsx`

- **`TickerText(props: TickerTextProps)`**
  - Ticker/scrolling text display component
  - Props: width, height

---

## 8. TouchUI Components

### `touchui/component.tsx`

- **`TouchUIProps`** (type)
  - Props: width, height

- **`TouchUI(props: TouchUIProps)`**
  - Main touch UI component
  - Manages touch interface elements

### `touchui/elements.tsx`

- **`Elements(props: ElementsProps)`**
  - Touch UI elements container
  - Props: width, height, onReset

### `touchui/thumbstick.tsx`

- **`ThumbStick(props)`**
  - Thumbstick/virtual joystick component
  - Handles directional input

### `touchui/togglekey.tsx`

- **`ToggleKey(props: ToggleKeyProps)`**
  - Toggle key button component
  - Props: x, y, letters, onToggle

### `touchui/touchplane.tsx`

- **`TouchPlane(props)`**
  - Touch plane/area component
  - Handles touch input region

### `touchui/keyboardgame.tsx`

- **`KeyboardGame(props: KeyboardGameProps)`**
  - Virtual keyboard game component
  - Props: width, height

### `touchui/stickinputs.ts`

- **`handlestickclear()`**
  - Clears all directional stick inputs (up, down, left, right)

- **`handlestickdir(snapdir: number)`**
  - Handles thumbstick direction input
  - Maps direction angle to input states
  - Supports modifier keys (alt, ctrl, shift)
  - Direction angles: 0, 45, 90, 135, 180, 225, 270, 315, 360

### `touchui/common.ts`

- **`LIST_LEFT`** (const)
  - Left position constant for lists (8)

---

## 9. Inspector Components

### `inspector/component.tsx`

- **`TapeTerminalInspector()`**
  - Main inspector component
  - Renders inspector UI with Select and Pts sub-components

### `inspector/select.tsx`

- **`Select()`**
  - Inspector select/dropdown component

### `inspector/pts.tsx`

- **`Pts()`**
  - Inspector points/data display component

---

## Summary by Category

| Category | File | Key Exports |
|----------|------|-------------|
| **Main Screens** | `tape/component.tsx` | `Tape()` - Main tape container |
| | `screenui/component.tsx` | `ScreenUI()` - Main UI coordinator |
| **Panel** | `panel/component.tsx` | `Panel()` - Panel container |
| | `panel/common.ts` | `PanelItemProps`, `ScrollContext`, utility functions |
| | `panel/*.tsx` | 13+ panel item components (text, number, range, select, etc.) |
| **Terminal** | `terminal/component.tsx` | `TapeTerminal()` - Terminal container |
| | `terminal/item.tsx` | `TapeTerminalItem()`, `TapeTerminalActiveItem()` |
| | `terminal/*.tsx` | Terminal action components (runit, copyit, openit, etc.) |
| **Editor** | `editor/component.tsx` | `TapeEditor()` - Code editor |
| | `editor/colors.tsx` | 20+ color constants, syntax highlighting functions |
| | `editor/*.tsx` | Editor UI components (rows, input, frame) |
| **Tape** | `tape/layout.tsx` | `TapeLayout()` - Layout component |
| | `tape/common.ts` | Constants, types, utility functions for tape/editor |
| | `tape/*.tsx` | Backplate, blinker components |
| **Scroll** | `scroll/component.tsx` | `Scroll()` - Scrollable panel |
| | `scroll/*.tsx` | Controls, backplate, marquee components |
| **ScreenUI** | `screenui/*.tsx` | `Framed()`, `TickerText()` components |
| **TouchUI** | `touchui/component.tsx` | `TouchUI()` - Touch interface |
| | `touchui/stickinputs.ts` | `handlestickclear()`, `handlestickdir()` |
| | `touchui/*.tsx` | Elements, thumbstick, toggle, keyboard components |
| **Inspector** | `inspector/component.tsx` | `TapeTerminalInspector()` |
| | `inspector/*.tsx` | `Select()`, `Pts()` components |

---

## Component Hierarchy

```
ScreenUI
├── Scroll (scrollable panels)
├── Panel (sidebar/interactive panels)
│   └── PanelItem* (various item types)
├── Tape
│   ├── TapeLayout
│   │   ├── TapeTerminal
│   │   │   ├── TerminalRows
│   │   │   └── TapeTerminalInput
│   │   └── TapeEditor
│   │       ├── EditorRows
│   │       └── EditorInput
│   └── TapeTerminalInspector
└── TouchUI (touch controls)
    ├── Elements
    ├── ThumbStick
    └── KeyboardGame
```

---

## Key Patterns

1. **React Context Usage**: Multiple contexts for communication:
   - `ScrollContext` - Scroll panel communication
   - `TapeTerminalContext` - Terminal message sending

2. **Text Rendering**: Extensive use of `WRITE_TEXT_CONTEXT` for text formatting and rendering

3. **Syntax Highlighting**: Comprehensive color system for ZSS code syntax highlighting

4. **Component Composition**: Panel items, terminal items, and editor components follow consistent patterns

5. **State Management**: Uses Zustand stores and React hooks for state management

