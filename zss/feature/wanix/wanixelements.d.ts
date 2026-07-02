/**
 * JSX + DOM types for Wanix custom elements.
 * @see https://github.com/tractordev/wanix — Elements Reference
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/** Presence attributes (`start`, `term`, `debug`, …) in JSX. */
type WanixFlag = boolean | ''

type WanixElementProps<
  T extends HTMLElement,
  A extends Record<string, unknown>,
> = DetailedHTMLProps<HTMLAttributes<T> & A, T>

/** Filesystem handle on `wanix-system` after `ready`. */
export type WanixRoot = {
  readDir: (path: string) => Promise<string[]>
  readFile: (path: string) => Promise<Uint8Array>
  readText: (path: string) => Promise<string>
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>
  appendFile: (path: string, data: string | Uint8Array) => Promise<void>
  bind: (name: string, newname: string) => Promise<void>
  unbind: (name: string, newname: string) => Promise<void>
  waitFor: (path: string, timeoutms?: number) => Promise<void>
  openReadable: (path: string) => Promise<ReadableStream<Uint8Array>>
  openWritable: (path: string) => Promise<WritableStream<Uint8Array>>
}

export type WanixSystemElement = HTMLElement & {
  instanceID: number
  isReady: boolean
  debug: boolean
  root: WanixRoot
  wasm: string
  allowOrigins: string[]
  openHandle: (tid?: string) => WanixRoot
}

export type WanixTaskElement = HTMLElement & {
  rid: string | null
  alias: string | null
  type: WanixTaskDriver
  role: string | null
  cmd: string | null
  term: string | null
  allocate: (bindElements?: NodeListOf<Element> | null) => Promise<void>
  start: () => Promise<void>
}

export type WanixVmElement = HTMLElement & {
  rid: string | null
  alias: string | null
  type: string
  term: string | null
  allocate: () => Promise<void>
  start: () => Promise<void>
}

export type WanixTermElement = HTMLElement & {
  path: string | null
  raw: boolean
  connect: () => Promise<void>
  disconnect: () => void
  fit: () => void
  write: (data: string) => void
  reset: () => void
  focus: () => void
  clear: () => void
}

export type WanixWorkbenchElement = HTMLElement & {
  assets: string
  wd: string
  debug: boolean
  raw: boolean
  load: (portcb: () => Record<string, unknown>) => void
}

export type WanixBindType = 'ns' | 'file' | 'archive' | 'import' | 'fetch'

export type WanixBindUnion = 'after' | 'before'

export type WanixTaskDriver = 'auto' | 'js' | 'gojs' | 'wasi' | (string & {})

export type WanixTaskRole = 'shell' | (string & {})

export type WanixWorkbenchSidebar = 'default' | 'hidden' | 'never'

type WanixSystemAttrs = {
  wasm?: string
  debug?: WanixFlag
  id?: string
  'allow-origins'?: string
}

type WanixBindAttrs = {
  dst?: string
  src?: string
  type?: WanixBindType
  perm?: string
  union?: WanixBindUnion
}

type WanixTaskAttrs = {
  cmd?: string
  type?: WanixTaskDriver
  role?: WanixTaskRole
  id?: string
  alias?: string
  env?: string
  wd?: string
  fsys?: string
  stdin?: string
  stdout?: string
  stderr?: string
  term?: WanixFlag
  start?: WanixFlag
  for?: string
}

type WanixVmAttrs = {
  type?: string
  id?: string
  alias?: string
  fsys?: string
  term?: WanixFlag
  start?: WanixFlag
  append?: string
  export?: string
  mem?: string
  'vga-mem'?: string
  hda?: string
  hdb?: string
  fda?: string
  fdb?: string
  cdrom?: string
  boot?: string
  bios?: string
  acpi?: string
  fastboot?: string
  kernel?: string
  initrd?: string
  netdev?: string
  virtfs?: string
}

type WanixTermAttrs = {
  path?: string
  raw?: WanixFlag
  for?: string
  'font-size'?: number | string
  'font-family'?: string
  'cursor-blink'?: boolean | 'false' | string
  'cursor-style'?: string
  scrollback?: number | string
}

type WanixWorkbenchAttrs = {
  assets?: string
  wd?: string
  open?: string
  term?: WanixFlag
  raw?: WanixFlag
  sidebar?: WanixWorkbenchSidebar
  welcome?: WanixFlag
  debug?: WanixFlag
  'task-ns'?: string
  'term-ns'?: string
  extension?: string
  fsys?: WanixFlag
}

type WanixSystemIntrinsicProps = WanixElementProps<
  WanixSystemElement,
  WanixSystemAttrs
>
type WanixBindIntrinsicProps = WanixElementProps<HTMLElement, WanixBindAttrs>
type WanixTaskIntrinsicProps = WanixElementProps<
  WanixTaskElement,
  WanixTaskAttrs
>
type WanixVmIntrinsicProps = WanixElementProps<WanixVmElement, WanixVmAttrs>
type WanixTermIntrinsicProps = WanixElementProps<
  WanixTermElement,
  WanixTermAttrs
>
type WanixWorkbenchIntrinsicProps = WanixElementProps<
  WanixWorkbenchElement,
  WanixWorkbenchAttrs
>

declare module 'react' {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- JSX intrinsic merge requires interface
    interface IntrinsicElements {
      'wanix-system': WanixSystemIntrinsicProps
      'wanix-bind': WanixBindIntrinsicProps
      'wanix-task': WanixTaskIntrinsicProps
      'wanix-vm': WanixVmIntrinsicProps
      'wanix-term': WanixTermIntrinsicProps
      'wanix-workbench': WanixWorkbenchIntrinsicProps
    }
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Window augmentation requires interface
  interface Window {
    __wanix?: Record<number, WanixSystemElement>
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- tag map augmentation requires interface
  interface HTMLElementTagNameMap {
    'wanix-system': WanixSystemElement
    'wanix-bind': HTMLElement
    'wanix-task': WanixTaskElement
    'wanix-vm': WanixVmElement
    'wanix-term': WanixTermElement
    'wanix-workbench': WanixWorkbenchElement
  }
}
