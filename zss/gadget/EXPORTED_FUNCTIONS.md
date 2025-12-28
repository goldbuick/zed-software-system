# Gadget Module - Exported Functions

This document categorizes and summarizes all exported functions from the `gadget` module.

## Table of Contents
1. [Core Engine & Rendering](#core-engine--rendering)
2. [User Input & Interaction](#user-input--interaction)
3. [State Management & Hooks](#state-management--hooks)
4. [Graphics & Rendering Layers](#graphics--rendering-layers)
5. [Display & Materials](#display--materials)
6. [Data Types & Utilities](#data-types--utilities)
7. [Effects & Post-Processing](#effects--post-processing)
8. [UI Components](#ui-components)
9. [Bitmap & Media Management](#bitmap--media-management)
10. [Gadget State API](#gadget-state-api)
11. [Tape & Terminal State](#tape--terminal-state)

---

## Core Engine & Rendering

**File:** `engine.tsx`

Main rendering engine component that sets up the 3D scene, camera, effects, and platform initialization.

### Components
- `Engine()` - Main engine component that initializes the platform, configures rendering settings (resolution, CRT effects, scanlines), sets up the camera, and renders the UI hierarchy

**File:** `userscreen.tsx`

Screen management and layout calculation based on viewport dimensions.

### Components
- `UserScreen({ children })` - Calculates screen dimensions in character units, handles margins, touch controls, and provides screen size context

### Hooks
- `useScreenSize()` - Returns screen dimensions in character units (cols, rows) and margins

---

## User Input & Interaction

**File:** `userinput.tsx`

Comprehensive input handling system supporting keyboard, gamepad, and touch input with modifier key support.

### Input State Management
- `inputdown(index, input)` - Sets an input state to pressed for a given player index
- `inputup(index, input)` - Sets an input state to released for a given player index
- `modsfromevent(event)` - Extracts modifier keys (alt, ctrl, shift) from a keyboard event

### Constants
- `INPUT_RATE` - Input polling rate constant (100ms)
- `UserInputContext` - React context for input event handling

### Types
- `UserInputMods` - Type for modifier keys (alt, ctrl, shift)
- `KeyboardInputHandler` - Type for keyboard event handlers
- `UserInputHandler` - Type for input event handlers with modifiers

### Components
- `UserInput(events)` - Component that subscribes to input events (MOVE_UP, MOVE_DOWN, MOVE_LEFT, MOVE_RIGHT, OK_BUTTON, CANCEL_BUTTON, MENU_BUTTON, keydown)
- `UserFocus({ blockhotkeys, children })` - Component that creates a focused input context, optionally blocking hotkeys
- `UserHotkey({ hotkey, althotkey, children })` - Component that triggers a callback when a hotkey is pressed

**File:** `clickable.tsx`

Clickable area component for UI interactions.

### Components
- `Clickable({ debug, disabled, blocking, cursor, width, height, children, onClick })` - Creates a clickable rectangular area with optional visual debugging

**File:** `scrollable.tsx`

Scrollable area component with mouse wheel support.

### Components
- `Scrollable({ debug, disabled, blocking, cursor, color, x, y, width, height, children, onClick, onScroll })` - Creates a scrollable area that handles wheel events and maps them to scroll deltas

---

## State Management & Hooks

**File:** `hooks.ts`

Core hooks and state management utilities for tiles, dither, media, and device data.

### Context & Hooks
- `WriteTextContext` - Context for text writing operations
- `useWriteText()` - Hook to access text writing context
- `useBlink()` - Hook that returns a boolean that toggles every 333ms for blinking effects

### Dither Management
- `DitherContext` - Context for dither data
- `useDither(width, height, dither)` - Hook that creates/manages a dither store for alpha values
- `resetDither(dither)` - Resets all dither values to 0
- `writeDither(dither, width, height, x, y, value)` - Writes a dither alpha value at a specific position

### Types
- `DITHER_DATA` - Type for dither data store (dither array, render counter, changed callback)

### Tiles Management
- `TilesContext` - Context for tiles data
- `useTiles(width, height, char, color, bg)` - Hook that creates/manages a tiles store for character, color, and background arrays
- `useTilesData()` - Hook to access the current tiles data from context
- `resetTiles(tiles, char, color, bg)` - Resets all tiles to specified values
- `writeTile(tiles, width, height, x, y, value)` - Writes tile data (char, color, bg) at a specific position

### Types
- `TILE_DATA` - Type for tiles data store (width, height, char/color/bg arrays, render counter, changed callback)

### Media Management
- `useMedia` - Zustand store for managing media assets (palette, charset, altcharset, sprites, screen videos, mood, viewimage)
- `useMedia.getState().reset()` - Resets media to default state
- `useMedia.getState().setmood(mood)` - Sets the mood string
- `useMedia.getState().setviewimage(viewimage)` - Sets the view image URL
- `useMedia.getState().setpalette(palette)` - Sets the palette bitmap
- `useMedia.getState().setcharset(charset)` - Sets the charset bitmap
- `useMedia.getState().setaltcharset(altcharset)` - Sets the alternate charset bitmap
- `useMedia.getState().setscreen(peer, screen)` - Sets a screen video element for a peer

### Types
- `MEDIA_DATA` - Type for media data store with palette, charset, sprites, screen videos, and setters

### Device Data
- `useDeviceData` - Zustand store for device configuration (active, saferows, insetcols, insetrows, islowrez, islandscape, sidebaropen, keyboard modifiers, showtouchcontrols, checknumbers, wordlist)

### Types
- `DEVICE_DATA` - Type for device configuration state

**File:** `data/state.ts`

Tape and gadget client state management.

### Hooks & Utilities
- `useEqual<S, U>(selector)` - Hook that returns a memoized selector function for equality checking

### Gadget Client State
- `useGadgetClient` - Zustand store for gadget client state (desync flag, gadget state, layer cache, slim format, zsswords dictionary)

### Tape State Stores
- `useTape` - Zustand store for tape display state (layout, inspector, quickterminal, toast, terminal, editor)
- `useTapeTerminal` - Zustand store for terminal state (scroll, cursor position, selection, input buffer)
- `useTapeEditor` - Zustand store for editor state (scroll offsets, cursor, selection)
- `useTapeInspector` - Zustand store for inspector state (pts array, cursor, selection)

### Types & Constants
- `TAPE_ROW` - Type for tape row data
- `TAPE_MAX_LINES` - Maximum number of lines in tape (1024)
- `TAPE_DISPLAY` - Enum for tape display modes (TOP, FULL, BOTTOM, SPLIT_X, MAX)

---

## Graphics & Rendering Layers

**File:** `graphics/flat.tsx`, `graphics/iso.tsx`, `graphics/fpv.tsx`, `graphics/mode7.tsx`

Graphics rendering components for different view modes.

### Components
- `FlatGraphics({ width, height })` - Renders flat/top-down graphics
- `IsoGraphics({ width, height })` - Renders isometric graphics
- `FPVGraphics({ width, height })` - Renders first-person view graphics
- `Mode7Graphics({ width, height })` - Renders Mode 7 style graphics

**File:** `graphics/flatlayer.tsx`, `graphics/isolayer.tsx`, `graphics/fpvlayer.tsx`, `graphics/mode7layer.tsx`

Layer components for different graphics modes.

### Components
- `FlatLayer({ id, z, from })` - Flat graphics layer
- `IsoLayer({ id, z, from, layers })` - Isometric graphics layer
- `FPVLayer({ id, z, from, layers })` - First-person view layer
- `Mode7Layer({ id, z, from, layers })` - Mode 7 layer

**File:** `graphics/tiles.tsx`

Tile rendering component.

### Components
- `Tiles({ char, color, bg, width, height })` - Renders a tilemap from character, color, and background arrays

**File:** `graphics/dither.tsx`

Dither/alpha rendering components.

### Components
- `Dither({ width, height, alphas })` - Renders dither effects from alpha array
- `StaticDither({ width, height, alpha })` - Renders a static dither with uniform alpha
- `ShadeBoxDither({ alpha, width, height, top, left, right, bottom })` - Renders a shaded box with dither effect

**File:** `graphics/blocks.tsx`

Block filtering functions for layer processing.

### Functions
- `filterlayer2floor(layer)` - Filters layer to extract floor blocks
- `filterlayer2walls(layer)` - Filters layer to extract wall blocks
- `filterlayer2water(layer)` - Filters layer to extract water blocks
- `filterlayer2sky(layer)` - Filters layer to extract sky blocks
- `filterlayer2flooredge(layer)` - Filters layer to extract floor edge blocks
- `filterlayer2skyedge(layer)` - Filters layer to extract sky edge blocks

**File:** `graphics/spritemeshes.tsx`, `graphics/billboardmeshes.tsx`, `graphics/pillarmeshes.tsx`, `graphics/shadowmeshes.tsx`, `graphics/darknessmeshes.tsx`

Mesh rendering components for different visual elements.

### Components
- `SpriteMeshes({ sprites, width, height })` - Renders sprite meshes
- `BillboardMeshes({ sprites, width, height })` - Renders billboard meshes
- `PillarwMeshes({ layer, width, height })` - Renders pillar meshes
- `ShadowMeshes({ layer, width, height })` - Renders shadow meshes
- `DarknessMeshes({ layer, width, height })` - Renders darkness meshes

**File:** `graphics/renderlayer.tsx`, `graphics/medialayer.tsx`

Layer rendering components.

### Components
- `RenderLayer({ id, z, from, layers })` - Generic render layer component
- `MediaLayers()` - Renders media layers

**File:** `graphics/effectcomposer.tsx`, `graphics/effectcomposermain.tsx`

Post-processing effect composers.

### Components
- `EffectComposer({ children, width, height })` - Effect composer component
- `EffectComposerMain({ children, width, height })` - Main effect composer component

### Types
- `EffectComposerProps` - Props type for effect composers

**File:** `graphics/rendertexture.tsx`

Render texture component.

### Components
- `RenderTexture` - Forward ref component for render textures

### Types
- `RenderTextureProps` - Props type for render texture

---

## Display & Materials

**File:** `display/tiles.ts`

Tilemap rendering utilities and materials.

### Functions
- `updateTilemapDataTexture(texture, char, color, bg, width, height)` - Updates a tilemap data texture with new tile data
- `createTilemapDataTexture(width, height)` - Creates a new tilemap data texture
- `createTilemapBufferGeometryAttributes(width, height)` - Creates buffer geometry attributes for tilemap rendering
- `createPillarBufferGeometryAttributes(width, height)` - Creates buffer geometry attributes for pillar rendering
- `createBillboardBufferGeometryAttributes()` - Creates buffer geometry attributes for billboard rendering
- `createTilemapMaterial()` - Creates a material for tilemap rendering

**File:** `display/dither.ts`

Dither rendering utilities and materials.

### Functions
- `updateDitherDataTexture(texture, alphas, width, height)` - Updates a dither data texture with new alpha values
- `createDitherDataTexture(width, height)` - Creates a new dither data texture
- `createDitherMaterial()` - Creates a material for dither rendering
- `createBlockDitherMaterial()` - Creates a material for block dither rendering

**File:** `display/blocks.ts`

Block rendering materials.

### Functions
- `createBlocksMaterial()` - Creates a material for block rendering
- `createBlocksBillboardMaterial()` - Creates a material for block billboard rendering
- `createdarknessmaterial()` - Creates a material for darkness rendering

**File:** `display/sprites.ts`

Sprite rendering materials.

### Functions
- `createSpritesMaterial()` - Creates a material for sprite rendering
- `createBillboardsMaterial()` - Creates a material for billboard rendering

**File:** `display/spritepool.ts`

Sprite pool management hook.

### Hooks
- `useSpritePool(sprites, width, height)` - Hook that manages a pool of sprite instances for efficient rendering

**File:** `display/textures.ts`

Texture utilities.

### Functions
- `updateTexture(texture)` - Updates texture settings (mipmaps, filters, needsUpdate)
- `createbitmaptexture(bitmap)` - Creates a canvas texture from a bitmap

### Hooks
- `useBitmapTexture(bitmap)` - Hook that creates a texture from a bitmap (memoized)

**File:** `display/anim.ts`

Animation timing utilities.

### Constants & Functions
- `time` - Object with value getter returning elapsed time in seconds
- `interval` - Object with value getter returning interval value based on BPM
- `DEFAULT_BPM` - Default beats per minute constant (136)
- `setAltInterval(bpm)` - Sets the interval value based on BPM
- `cloneMaterial(material)` - Clones a shader material and adds time/interval uniforms

---

## Data Types & Utilities

**File:** `data/types.ts`

Core type definitions and constants for the gadget system.

### Constants
- `FILE_BYTES_PER_CHAR` - Bytes per character in file format (14)
- `FILE_BYTES_PER_COLOR` - Bytes per color in file format (3)
- `CHAR_WIDTH` - Character width in pixels (8)
- `CHAR_HEIGHT` - Character height in pixels (14)
- `BYTES_PER_CHAR` - Total bytes per character bitmap (112)
- `CHARS_PER_ROW` - Characters per row in charset (16)
- `CHARS_TOTAL_ROWS` - Total rows in charset (16)
- `PALETTE_COLORS` - Number of colors in palette (16)
- `CHAR_YSCALE` - Character Y scale ratio
- `INPUT_ALT` - Input modifier flag for Alt (0x0001)
- `INPUT_CTRL` - Input modifier flag for Ctrl (0x0010)
- `INPUT_SHIFT` - Input modifier flag for Shift (0x0100)

### Types
- `TILES` - Type for tile data (char, color, bg arrays)
- `SPRITE` - Type for sprite data (id, x, y, char, color, bg, stat, pid)
- `LAYER_BLANK` - Type for blank layer
- `LAYER_TILES` - Type for tiles layer
- `LAYER_SPRITES` - Type for sprites layer
- `LAYER_DITHER` - Type for dither layer
- `LAYER_MEDIA` - Type for media layer
- `LAYER_CONTROL` - Type for control layer
- `LAYER` - Union type for all layer types
- `PANEL_ITEM` - Type for panel items (WORD or WORD array)
- `UNOBSERVE_FUNC` - Type for unobserve function
- `PANEL_SHARED` - Type for panel shared state
- `GADGET_STATE` - Type for gadget state

### Enums
- `LAYER_TYPE` - Enum for layer types (BLANK, TILES, SPRITES, DITHER, MEDIA, CONTROL)
- `VIEWSCALE` - Enum for view scales (FAR=1, MID=1.5, NEAR=3)
- `INPUT` - Enum for input types (NONE, ALT, CTRL, SHIFT, MOVE_UP, MOVE_DOWN, MOVE_LEFT, MOVE_RIGHT, OK_BUTTON, CANCEL_BUTTON, MENU_BUTTON)

### Factory Functions
- `createtiles(player, index, width, height, bg)` - Creates a tiles layer
- `createsprite(player, index, id, char, color)` - Creates a sprite
- `createsprites(player, index)` - Creates a sprites layer
- `createdither(player, index, width, height, fill)` - Creates a dither layer
- `createmedia(player, index, mime, media)` - Creates a media layer
- `createcontrol(player, index)` - Creates a control layer

### Utility Functions
- `layersreadmedia(layers)` - Filters layers to extract media layers
- `layersreadcontrol(layers)` - Extracts control data from layers (width, height, focus, viewscale, graphics, facing)
- `paneladdress(chip, target)` - Creates a panel address string from chip and target

**File:** `data/palette.ts`

Palette conversion utilities.

### Functions
- `convertpalettetocolors(palette, count)` - Converts a bitmap palette to Three.js Color array

---

## Effects & Post-Processing

**File:** `fx/crt.tsx`

CRT screen effect.

### Components
- `CRTShape` - CRT shape distortion effect component

### Types
- `CRTShapeProps` - Props type for CRT shape effect

**File:** `fx/scanlines.ts`

Scanlines effect.

### Components
- `Scanlines` - Scanlines overlay effect component

### Types
- `ScanlinesProps` - Props type for scanlines effect

**File:** `fx/depthfog.ts`

Depth fog effect.

### Components
- `DepthFog` - Depth-based fog effect component

### Types
- `DepthFogProps` - Props type for depth fog effect

**File:** `fx/util.ts`

Shader utility strings.

### Constants
- `blendutilshader` - Shader code for blending utilities
- `aasteputilshader` - Shader code for AA step utilities
- `noiseutilshader` - Shader code for noise utilities

**File:** `fx/halftone.ts`

Halftone effect shader.

### Constants
- `halftonefragshader` - Fragment shader code for halftone effect

---

## UI Components

**File:** `rect.tsx`

Rectangular plane component.

### Components
- `Rect` - Forward ref component for rendering rectangular planes with optional blocking, cursor, and click handling

**File:** `toast.tsx`

Toast notification component.

### Components
- `TapeToast()` - Displays toast notifications at the top of the screen with marquee text and dither overlay

**File:** `viewimage.tsx`

Image viewer component.

### Components
- `TapeViewImage()` - Displays a full-screen image viewer with cancel button support

**File:** `usetiles.tsx`

Tiles data and render components.

### Components
- `TilesData({ store, children })` - Provides tiles context to children
- `TilesRender({ width, height })` - Renders tiles from context

**File:** `usedither.tsx`

Dither data and render components.

### Components
- `DitherData({ store, children })` - Provides dither context to children
- `DitherRender({ width, height })` - Renders dither from context

---

## Bitmap & Media Management

**File:** `data/bitmap.ts`

Bitmap creation and manipulation utilities.

### Types
- `BITMAP` - Type for bitmap data (width, height, size, bits array)

### Functions
- `bitmapToCanvas(bitmap)` - Converts a bitmap to an HTML canvas element
- `createbitmap(width, height)` - Creates a new empty bitmap
- `createbitmapfromarray(width, height, bits)` - Creates a bitmap from an array of bit values
- `createspritebitmapfrombitmap(source, charwidth, charheight)` - Creates a sprite bitmap with padding from a source bitmap

---

## Gadget State API

**File:** `data/api.ts`

API for managing gadget state, panels, and hyperlinks.

### State Management
- `initstate()` - Creates a new empty gadget state
- `gadgetstateprovider(provider)` - Sets the provider function for gadget state
- `gadgetstate(element)` - Gets the gadget state for an element/player

### Panel Management
- `gadgetclearscroll(element)` - Clears the scroll queue for an element
- `gadgetcheckqueue(element)` - Gets and clears the panel queue for an element
- `gadgetaddcenterpadding(queue)` - Adds padding between centered and non-centered items in a queue
- `gadgettext(element, text)` - Adds text to an element's panel queue

### Hyperlink Management
- `gadgethyperlink(player, chip, label, words, get, set)` - Creates a hyperlink panel item with shared state tracking for certain types (range, select, number, text, etc.)

### Value Tracking
- `gadgetcheckset(chip, name, value)` - Checks if a set operation matches any tracked shared state and updates it

**File:** `data/compress.ts`

Gadget state serialization utilities.

### Functions
- `exportgadgetstate(gadget)` - Exports gadget state to a format object
- `importgadgetstate(gadget)` - Imports gadget state from a format object

---

## Tape & Terminal State

**File:** `data/state.ts`

State management for tape display, terminal, editor, and inspector.

### Tape Display State
- `useTape` - Zustand store managing tape display state:
  - `layout` - Display layout mode (TAPE_DISPLAY enum)
  - `inspector` - Inspector visibility flag
  - `quickterminal` - Quick terminal flag
  - `toast` - Toast message string
  - `terminal` - Terminal state (open, logs)
  - `editor` - Editor state (open, book, path, type, title)
  - `reset()` - Resets tape state to defaults

### Terminal State
- `useTapeTerminal` - Zustand store managing terminal state:
  - `scroll` - Scroll offset
  - `xcursor`, `ycursor` - Cursor position
  - `xselect`, `yselect` - Selection position
  - `bufferindex` - Input buffer index
  - `buffer` - Input history buffer
  - `reset()` - Resets terminal state

### Editor State
- `useTapeEditor` - Zustand store managing editor state:
  - `xscroll`, `yscroll` - Scroll offsets
  - `cursor` - Text cursor position
  - `select` - Selection position
  - `reset()` - Resets editor state

### Inspector State
- `useTapeInspector` - Zustand store managing inspector state:
  - `pts` - Array of point matches
  - `cursor` - Cursor board index
  - `select` - Selection board index
  - `reset()` - Resets inspector state

---

## Summary

The gadget module provides a comprehensive rendering and interaction system with:

- **Core Engine**: Main rendering loop with 3D scene setup
- **Input System**: Multi-device input handling (keyboard, gamepad, touch) with modifier support
- **State Management**: Zustand stores for gadget state, tape, terminal, editor, and device configuration
- **Graphics Layers**: Multiple rendering modes (flat, isometric, FPV, Mode 7) with layer management
- **Display System**: Material creation and texture management for tiles, sprites, blocks, and dither
- **Effects**: Post-processing effects (CRT, scanlines, depth fog, halftone)
- **UI Components**: Reusable components for interaction (clickable, scrollable, toast, image viewer)
- **Data Management**: Bitmap manipulation, palette conversion, state serialization
- **API**: Functions for managing gadget state, panels, hyperlinks, and shared state tracking

