import { parse } from 'espree'

import { WASM_PLAYCODE_GLOBALS } from './wasmplaycodeglobals'

export type WASM_PLAYCODE_LINT_ISSUE = {
  name: string
  line: number
  column: number
  message: string
}

export type WASM_PLAYCODE_LINT_RESULT = {
  ok: boolean
  issues: WASM_PLAYCODE_LINT_ISSUE[]
}

type ESTreeNode = {
  type: string
  [key: string]: unknown
}

type ESTreeIdentifier = ESTreeNode & {
  type: 'Identifier'
  name: string
  loc?: {
    start: { line: number; column: number }
  }
}

function wrapplaycode(code: string): string {
  const normalized = code.replace(/Maximilian/g, 'Module')
  return `var qref = {};\n${normalized}`
}

function syntaxissue(err: unknown): WASM_PLAYCODE_LINT_ISSUE[] {
  if (!(err instanceof SyntaxError)) {
    throw err
  }
  const match = /line (\d+)/i.exec(String(err.message))
  const line = match ? Number(match[1]) : 1
  return [
    {
      name: 'SyntaxError',
      line,
      column: 0,
      message: err.message,
    },
  ]
}

function isidentifier(node: unknown): node is ESTreeIdentifier {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as ESTreeNode).type === 'Identifier'
  )
}

function childnodes(node: ESTreeNode): ESTreeNode[] {
  const out: ESTreeNode[] = []
  for (const key of Object.keys(node)) {
    const value = node[key]
    if (!value) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'type' in item) {
          out.push(item as ESTreeNode)
        }
      }
    } else if (typeof value === 'object' && 'type' in value) {
      out.push(value as ESTreeNode)
    }
  }
  return out
}

function collectdeclarations(node: ESTreeNode, declared: Set<string>) {
  switch (node.type) {
    case 'FunctionDeclaration':
      if (isidentifier(node.id)) {
        declared.add(node.id.name)
      }
      for (const param of (node.params as ESTreeNode[]) ?? []) {
        if (isidentifier(param)) {
          declared.add(param.name)
        }
      }
      if (node.body) {
        collectdeclarations(node.body as ESTreeNode, declared)
      }
      return
    case 'VariableDeclaration':
      for (const decl of (node.declarations as ESTreeNode[]) ?? []) {
        const id = decl.id
        if (isidentifier(id)) {
          declared.add(id.name)
        }
      }
      return
    case 'CatchClause':
      if (isidentifier(node.param)) {
        declared.add(node.param.name)
      }
      if (node.body) {
        collectdeclarations(node.body as ESTreeNode, declared)
      }
      return
    default:
      break
  }

  for (const child of childnodes(node)) {
    collectdeclarations(child, declared)
  }
}

function isdeclarationname(
  node: ESTreeNode,
  parent: ESTreeNode | undefined,
): boolean {
  if (!parent) {
    return false
  }
  if (parent.type === 'FunctionDeclaration' && parent.id === node) {
    return true
  }
  if (parent.type === 'VariableDeclarator' && parent.id === node) {
    return true
  }
  if (parent.type === 'Property' && parent.key === node) {
    if (parent.shorthand === true) {
      return false
    }
    if (parent.computed !== true) {
      return true
    }
  }
  if (
    parent.type === 'MemberExpression' &&
    parent.property === node &&
    parent.computed !== true
  ) {
    return true
  }
  if (parent.type === 'CatchClause' && parent.param === node) {
    return true
  }
  return false
}

function walkscope(
  node: ESTreeNode,
  outer: Set<string>,
  local: Set<string>,
  globals: Set<string>,
  issues: WASM_PLAYCODE_LINT_ISSUE[],
  seen: Set<string>,
  parent?: ESTreeNode,
) {
  if (node.type === 'Identifier') {
    const id = node as ESTreeIdentifier
    if (!isdeclarationname(node, parent)) {
      const name = id.name
      if (!local.has(name) && !outer.has(name) && !globals.has(name)) {
        const loc = id.loc?.start
        const key = `${name}:${loc?.line ?? 0}:${loc?.column ?? 0}`
        if (!seen.has(key)) {
          seen.add(key)
          issues.push({
            name,
            line: loc?.line ?? 0,
            column: loc?.column ?? 0,
            message: `'${name}' is not defined`,
          })
        }
      }
    }
  }

  if (node.type === 'VariableDeclaration') {
    for (const decl of (node.declarations as ESTreeNode[]) ?? []) {
      const init = decl.init as ESTreeNode | undefined
      if (init) {
        walkscope(init, outer, local, globals, issues, seen, decl)
      }
      const id = decl.id
      if (isidentifier(id)) {
        local.add(id.name)
      }
    }
    return
  }

  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    const fnlocal = new Set<string>()
    const merged = new Set([...outer, ...local])
    if (node.type === 'FunctionDeclaration' && isidentifier(node.id)) {
      fnlocal.add(node.id.name)
    }
    for (const param of (node.params as ESTreeNode[]) ?? []) {
      if (isidentifier(param)) {
        fnlocal.add(param.name)
      }
    }
    const body = node.body as ESTreeNode | undefined
    if (body) {
      walkscope(body, merged, fnlocal, globals, issues, seen, node)
    }
    return
  }

  for (const child of childnodes(node)) {
    walkscope(child, outer, local, globals, issues, seen, node)
  }
}

/** Statically lint assembled WASM play code for undefined identifiers. */
export function lintwasmplaycode(
  code: string,
  extraGlobals: string[] = [],
): WASM_PLAYCODE_LINT_RESULT {
  const globals = new Set([...WASM_PLAYCODE_GLOBALS, ...extraGlobals])
  const wrapped = wrapplaycode(code)

  let ast: ESTreeNode
  try {
    ast = parse(wrapped, {
      ecmaVersion: 2020,
      sourceType: 'script',
      loc: true,
    }) as ESTreeNode
  } catch (err) {
    return { ok: false, issues: syntaxissue(err) }
  }

  const declared = new Set<string>()
  collectdeclarations(ast, declared)

  const issues: WASM_PLAYCODE_LINT_ISSUE[] = []
  const seen = new Set<string>()
  walkscope(ast, declared, new Set<string>(), globals, issues, seen)

  issues.sort((a, b) => a.line - b.line || a.column - b.column)
  return { ok: issues.length === 0, issues }
}

export function formatwasmplaycodelint(
  bundlename: string,
  result: WASM_PLAYCODE_LINT_RESULT,
): string {
  if (result.ok) {
    return `${bundlename}: ok`
  }
  const lines = result.issues.map(
    (issue) => `  ${bundlename}:${issue.line}:${issue.column} ${issue.message}`,
  )
  return [`${bundlename}: ${result.issues.length} issue(s)`, ...lines].join(
    '\n',
  )
}
