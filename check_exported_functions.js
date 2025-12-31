#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Extract all exported functions from a file
 */
function extractExportedFunctions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const functions = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Match: export function name(...) or export async function name(...)
    // Also handle TypeScript generics: name<T>(...)
    const functionMatch = trimmed.match(
      /^export\s+(?:async\s+)?function\s+(\w+)(?:<[^>]+>)?\s*\(/,
    )
    if (functionMatch) {
      const name = functionMatch[1]
      // Extract parameters
      const paramMatch = line.match(/\(([^)]*)\)/)
      const params = paramMatch ? paramMatch[1] : ''
      functions.push({ name, params, line: i + 1 })
    }
  }

  return functions
}

/**
 * Parse EXPORTED_FUNCTIONS.md to get documented functions
 */
function parseDocumentedFunctions() {
  const docPath = path.join(__dirname, 'zss', 'memory', 'EXPORTED_FUNCTIONS.md')
  const content = fs.readFileSync(docPath, 'utf8')
  const lines = content.split('\n')

  const documented = {}
  let currentFile = null

  for (const line of lines) {
    // Match file header: ## filename.ts
    const fileMatch = line.match(/^##\s+(\w+\.ts)$/)
    if (fileMatch) {
      currentFile = fileMatch[1]
      documented[currentFile] = []
      continue
    }

    // Match function: - **functionname(params)** - description
    if (currentFile) {
      const funcMatch = line.match(/^-\s+\*\*(\w+)\(([^)]*)\)\*\*/)
      if (funcMatch) {
        const name = funcMatch[1]
        const params = funcMatch[2]
        documented[currentFile].push({ name, params })
      }
    }
  }

  return documented
}

/**
 * Compare actual vs documented functions
 */
function compareFunctions() {
  const memoryDir = path.join(__dirname, 'zss', 'memory')
  const files = fs
    .readdirSync(memoryDir)
    .filter((f) => f.endsWith('.ts') && f !== 'types.ts')
    .map((f) => path.join(memoryDir, f))

  const documented = parseDocumentedFunctions()
  const issues = []

  for (const filePath of files) {
    const fileName = path.basename(filePath)
    const actualFunctions = extractExportedFunctions(filePath)
    const docFunctions = documented[fileName] || []

    const actualNames = new Set(actualFunctions.map((f) => f.name))
    const docNames = new Set(docFunctions.map((f) => f.name))

    // Find missing in docs
    const missingInDocs = actualFunctions.filter(
      (f) => !docNames.has(f.name),
    )
    // Find extra in docs
    const extraInDocs = docFunctions.filter((f) => !actualNames.has(f.name))

    if (missingInDocs.length > 0 || extraInDocs.length > 0) {
      issues.push({
        file: fileName,
        missingInDocs,
        extraInDocs,
        actualCount: actualFunctions.length,
        docCount: docFunctions.length,
      })
    }
  }

  return issues
}

// Main execution
console.log('Checking EXPORTED_FUNCTIONS.md against actual exports...\n')

const issues = compareFunctions()

if (issues.length === 0) {
  console.log('✓ All functions match!')
} else {
  for (const issue of issues) {
    console.log(`\n📄 ${issue.file}`)
    console.log(`   Actual: ${issue.actualCount} functions`)
    console.log(`   Documented: ${issue.docCount} functions`)

    if (issue.missingInDocs.length > 0) {
      console.log(`\n   ❌ Missing in docs (${issue.missingInDocs.length}):`)
      for (const func of issue.missingInDocs) {
        console.log(`      - ${func.name} (line ${func.line})`)
      }
    }

    if (issue.extraInDocs.length > 0) {
      console.log(`\n   ⚠️  Extra in docs (${issue.extraInDocs.length}):`)
      for (const func of issue.extraInDocs) {
        console.log(`      - ${func.name}`)
      }
    }
  }
  console.log(`\n\nFound ${issues.length} file(s) with mismatches`)
}

