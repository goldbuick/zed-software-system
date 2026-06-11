import {
  type Path,
  formatJsonPointer,
} from '@jsonjoy.com/json-pointer/lib/util'
import type { Operation as FastOperation } from 'fast-json-patch'
import { decode as decodecompact } from 'json-joy/lib/json-patch/codec/compact/decode'
import { encode as encodecompact } from 'json-joy/lib/json-patch/codec/compact/encode'
import type { CompactOp } from 'json-joy/lib/json-patch/codec/compact/types'
import { decode as decodejsonops } from 'json-joy/lib/json-patch/codec/json/decode'
import { encode as encodejsonops } from 'json-joy/lib/json-patch/codec/json/encode'
import type { Operation } from 'json-joy/lib/json-patch/codec/json/types'
import { OPCODE } from 'json-joy/lib/json-patch/constants'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'

const JSONPATCH_OPTIONS = {}
const MIN_PREFIX_LEN = 8
const MIN_SUFFIX_SAVINGS = 4

/** Path on the wire: full JSON pointer or `[prefixIndex, suffix]`. */
export type PATH_REF = string | [number, string]

export type PATCH_WIRE_V2 = {
  v: 2
  pfx: string[]
  ops: CompactOp[]
}

function longestcommonprefix(paths: string[]): string {
  if (paths.length === 0) {
    return ''
  }
  let prefix = paths[0]
  for (let i = 1; i < paths.length; ++i) {
    const path = paths[i]
    while (!path.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
      if (prefix.length === 0) {
        return ''
      }
    }
  }
  return prefix
}

function truncatetosegmentboundary(prefix: string): string {
  if (prefix.length === 0) {
    return ''
  }
  const lastslash = prefix.lastIndexOf('/')
  if (lastslash <= 0) {
    return ''
  }
  return prefix.slice(0, lastslash + 1)
}

function collectpathsfromops(ops: FastOperation[]): string[] {
  const paths: string[] = []
  for (let i = 0; i < ops.length; ++i) {
    const op = ops[i]
    if (isstring(op.path)) {
      paths.push(op.path)
    }
    if (
      (op.op === 'move' || op.op === 'copy') &&
      'from' in op &&
      isstring(op.from)
    ) {
      paths.push(op.from)
    }
  }
  return paths
}

function buildprefixtable(paths: string[]): string[] {
  const unique = [...new Set(paths)]
  if (unique.length < 2) {
    return []
  }
  const pfx: string[] = []
  const lcp = truncatetosegmentboundary(longestcommonprefix(unique))
  if (lcp.length >= MIN_PREFIX_LEN) {
    const using = unique.filter(
      (path) => path.startsWith(lcp) && path.length > lcp.length,
    )
    if (using.length >= 2) {
      pfx.push(lcp)
    }
  }
  const groups = new Map<string, string[]>()
  for (let i = 0; i < unique.length; ++i) {
    const path = unique[i]
    const lastslash = path.lastIndexOf('/')
    const parent = lastslash > 0 ? path.slice(0, lastslash + 1) : path
    const group = groups.get(parent) ?? []
    group.push(path)
    groups.set(parent, group)
  }
  for (const [parent, group] of groups) {
    if (
      group.length >= 2 &&
      parent.length >= MIN_PREFIX_LEN &&
      !pfx.includes(parent)
    ) {
      pfx.push(parent)
    }
  }
  pfx.sort((a, b) => b.length - a.length)
  return pfx
}

function compactpathtostring(path: string | Path | PATH_REF): string {
  if (ispathref(path)) {
    return ''
  }
  if (isstring(path)) {
    return path
  }
  if (isarray(path)) {
    return formatJsonPointer(path as Path)
  }
  return String(path)
}

function expandpathref(ref: PATH_REF, pfx: string[]): string {
  if (isstring(ref)) {
    return ref
  }
  const [idx, suffix] = ref
  const head = pfx[idx] ?? ''
  if (!suffix) {
    return head
  }
  if (head.endsWith('/')) {
    return `${head}${suffix}`
  }
  return `${head}/${suffix}`
}

function shortenpathref(path: string, pfx: string[]): PATH_REF {
  let bestidx = -1
  let bestlen = 0
  for (let i = 0; i < pfx.length; ++i) {
    const candidate = pfx[i]
    if (path.startsWith(candidate) && candidate.length > bestlen) {
      bestidx = i
      bestlen = candidate.length
    }
  }
  if (bestidx < 0) {
    return path
  }
  const suffix = path.slice(pfx[bestidx].length)
  if (path.length - suffix.length < MIN_SUFFIX_SAVINGS) {
    return path
  }
  return [bestidx, suffix]
}

function readcompactpathref(value: unknown): PATH_REF {
  if (ispathref(value)) {
    return value
  }
  return compactpathtostring(value as string | Path)
}

function expandcompactpathrefs(op: CompactOp, pfx: string[]): CompactOp {
  const expanded = [...op] as unknown as CompactOp
  expanded[1] = expandpathref(
    readcompactpathref(expanded[1]),
    pfx,
  ) as CompactOp[1]
  const opcode = expanded[0]
  if (
    opcode === OPCODE.move ||
    opcode === OPCODE.copy ||
    opcode === 'move' ||
    opcode === 'copy'
  ) {
    expanded[2] = expandpathref(
      readcompactpathref(expanded[2]),
      pfx,
    ) as CompactOp[2]
  }
  return expanded
}

function normalizecompactpaths(op: CompactOp): CompactOp {
  const normalized = [...op] as unknown as CompactOp
  normalized[1] = compactpathtostring(
    normalized[1] as string | Path,
  ) as CompactOp[1]
  const opcode = normalized[0]
  if (
    opcode === OPCODE.move ||
    opcode === OPCODE.copy ||
    opcode === 'move' ||
    opcode === 'copy'
  ) {
    normalized[2] = compactpathtostring(
      normalized[2] as string | Path,
    ) as CompactOp[2]
  }
  return normalized
}

function shortencompactpathrefs(op: CompactOp, pfx: string[]): CompactOp {
  const shortened = [...op] as unknown as CompactOp
  shortened[1] = shortenpathref(
    compactpathtostring(shortened[1] as string | Path),
    pfx,
  ) as unknown as CompactOp[1]
  const opcode = shortened[0]
  if (
    opcode === OPCODE.move ||
    opcode === OPCODE.copy ||
    opcode === 'move' ||
    opcode === 'copy'
  ) {
    shortened[2] = shortenpathref(
      compactpathtostring(shortened[2] as string | Path),
      pfx,
    ) as unknown
  }
  return shortened
}

function fastoptojsonop(op: FastOperation): Operation {
  switch (op.op) {
    case 'add':
      return { op: 'add', path: op.path, value: op.value }
    case 'remove':
      return { op: 'remove', path: op.path }
    case 'replace':
      return { op: 'replace', path: op.path, value: op.value }
    case 'move':
      return { op: 'move', path: op.path, from: op.from }
    case 'copy':
      return { op: 'copy', path: op.path, from: op.from }
    default:
      return op as Operation
  }
}

function jsonpathtostring(path: string | Path): string {
  if (isstring(path)) {
    return path
  }
  return formatJsonPointer(path)
}

function jsonoptofastop(op: Operation): FastOperation {
  switch (op.op) {
    case 'add':
      return {
        op: 'add',
        path: jsonpathtostring(op.path),
        value: op.value,
      }
    case 'remove':
      return { op: 'remove', path: jsonpathtostring(op.path) }
    case 'replace':
      return {
        op: 'replace',
        path: jsonpathtostring(op.path),
        value: op.value,
      }
    case 'move':
      return {
        op: 'move',
        path: jsonpathtostring(op.path),
        from: jsonpathtostring(op.from),
      }
    case 'copy':
      return {
        op: 'copy',
        path: jsonpathtostring(op.path),
        from: jsonpathtostring(op.from),
      }
    default:
      return op as FastOperation
  }
}

export function ispatchwirev2(data: unknown): data is PATCH_WIRE_V2 {
  if (!ispresent(data) || typeof data !== 'object') {
    return false
  }
  const wire = data as PATCH_WIRE_V2
  return (
    wire.v === 2 &&
    isarray(wire.pfx) &&
    wire.pfx.every((entry) => isstring(entry)) &&
    isarray(wire.ops)
  )
}

/** RFC 6902 → jsonpipe v2 wire envelope. */
export function encodepatchwire(ops: FastOperation[]): PATCH_WIRE_V2 {
  if (ops.length === 0) {
    return { v: 2, pfx: [], ops: [] }
  }
  const pfx = buildprefixtable(collectpathsfromops(ops))
  const jsonops = decodejsonops(
    ops.map((op) => fastoptojsonop(op)),
    JSONPATCH_OPTIONS,
  )
  const compact = encodecompact(jsonops).map((op) => normalizecompactpaths(op))
  const shortened = compact.map((op) => shortencompactpathrefs(op, pfx))
  return { v: 2, pfx, ops: shortened }
}

/** jsonpipe v2 only → RFC 6902 for applyPatch. Rejects verbose/legacy wire. */
export function decodepatchwire(data: unknown): FastOperation[] {
  if (!ispatchwirev2(data)) {
    return []
  }
  const expanded = data.ops.map((op) => expandcompactpathrefs(op, data.pfx))
  const joyops = decodecompact(expanded, JSONPATCH_OPTIONS)
  const jsonops = encodejsonops(joyops)
  return jsonops.map((op) => jsonoptofastop(op))
}

export function wirepatchsizebytes(wire: PATCH_WIRE_V2): number {
  return JSON.stringify(wire).length
}

export function verbosepatchsizebytes(ops: FastOperation[]): number {
  return JSON.stringify(ops).length
}

/** @internal test helper */
export function readpathref(op: CompactOp): PATH_REF {
  return op[1] as PATH_REF
}

export function ispathref(value: unknown): value is [number, string] {
  return (
    isarray(value) &&
    value.length === 2 &&
    isnumber(value[0]) &&
    isstring(value[1])
  )
}
