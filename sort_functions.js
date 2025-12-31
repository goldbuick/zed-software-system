#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Extract all exported functions from a file
 */
function extractFunctions(content) {
  const functions = []
  const lines = content.split('\n')

  let currentFunction = null
  let braceDepth = 0
  let inString = false
  let stringChar = null
  let inComment = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Simple string/comment tracking
    let lineInString = false
    let lineStringChar = null
    let lineInComment = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      const prevChar = j > 0 ? line[j - 1] : null
      const nextChar = j < line.length - 1 ? line[j + 1] : null

      if (!lineInString && !lineInComment) {
        if (char === '"' || char === "'" || char === '`') {
          if (prevChar !== '\\') {
            lineInString = true
            lineStringChar = char
          }
        } else if (char === '/' && nextChar === '/') {
          lineInComment = true
          break
        } else if (char === '/' && prevChar === '*') {
          lineInComment = false
        } else if (char === '*' && prevChar === '/') {
          lineInComment = true
        }
      } else if (lineInString) {
        if (char === lineStringChar && prevChar !== '\\') {
          lineInString = false
          lineStringChar = null
        }
      }
    }

    inString = lineInString
      ? lineStringChar
      : inString && !lineInString
        ? null
        : inString
    inComment = lineInComment || (inComment && !trimmed.includes('*/'))

    // Check for function start
    if (
      !inString &&
      !inComment &&
      trimmed.match(/^export\s+(?:async\s+)?function\s+\w+/)
    ) {
      // Save previous function if exists
      if (currentFunction) {
        functions.push(currentFunction)
      }
      currentFunction = {
        name:
          trimmed.match(/^export\s+(?:async\s+)?function\s+(\w+)/)?.[1] || '',
        lines: [line],
        startIndex: i,
      }
      braceDepth = 0
      // Count braces on this line
      for (const char of line) {
        if (char === '{') braceDepth++
        if (char === '}') braceDepth--
      }
    } else if (currentFunction) {
      currentFunction.lines.push(line)
      // Count braces (only if not in string)
      if (!inString) {
        for (const char of line) {
          if (char === '{') braceDepth++
          if (char === '}') braceDepth--
        }
      }
      // Function ends when brace depth returns to 0
      if (braceDepth === 0 && trimmed.endsWith('}')) {
        functions.push(currentFunction)
        currentFunction = null
      }
    }
  }

  if (currentFunction) {
    functions.push(currentFunction)
  }

  return functions
}

/**
 * Extract non-function content (imports, types, constants, etc.)
 */
function extractNonFunctionContent(content, functionRanges) {
  const lines = content.split('\n')
  const nonFunctionLines = []
  const functionIndices = new Set()

  functionRanges.forEach((fn) => {
    for (let i = fn.startIndex; i < fn.startIndex + fn.lines.length; i++) {
      functionIndices.add(i)
    }
  })

  for (let i = 0; i < lines.length; i++) {
    if (!functionIndices.has(i)) {
      nonFunctionLines.push({ line: lines[i], index: i })
    }
  }

  return nonFunctionLines
}

/**
 * Process a single file
 */
function processFile(filePath) {
  console.log(`Processing ${path.basename(filePath)}...`)

  const content = fs.readFileSync(filePath, 'utf8')
  const functions = extractFunctions(content)

  if (functions.length === 0) {
    console.log('  - No exported functions found')
    return
  }

  // Sort functions by name
  functions.sort((a, b) => a.name.localeCompare(b.name))

  // Extract all non-function content
  const allLines = content.split('\n')
  const functionLineSet = new Set()

  functions.forEach((fn) => {
    for (let i = fn.startIndex; i < fn.startIndex + fn.lines.length; i++) {
      functionLineSet.add(i)
    }
  })

  const beforeFunctions = []
  const afterFunctions = []
  let foundFirstFunction = false

  for (let i = 0; i < allLines.length; i++) {
    if (functionLineSet.has(i)) {
      foundFirstFunction = true
      continue
    }

    if (!foundFirstFunction) {
      beforeFunctions.push(allLines[i])
    } else {
      afterFunctions.push(allLines[i])
    }
  }

  // Reconstruct file
  const output = []

  // Add content before functions
  output.push(...beforeFunctions)

  // Remove trailing empty lines from before section
  while (output.length > 0 && output[output.length - 1].trim() === '') {
    output.pop()
  }

  // Add blank line before functions if needed
  if (output.length > 0 && output[output.length - 1].trim() !== '') {
    output.push('')
  }

  // Add sorted functions
  functions.forEach((fn, index) => {
    output.push(...fn.lines)
    if (index < functions.length - 1) {
      output.push('')
    }
  })

  // Add content after functions
  if (afterFunctions.length > 0) {
    // Remove leading empty lines
    while (afterFunctions.length > 0 && afterFunctions[0].trim() === '') {
      afterFunctions.shift()
    }
    if (afterFunctions.length > 0) {
      output.push('')
      output.push(...afterFunctions)
    }
  }

  const newContent = output.join('\n')

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8')
    console.log(`  ✓ Sorted ${functions.length} functions`)
  } else {
    console.log(`  - Already sorted (${functions.length} functions)`)
  }
}

// Main execution
const memoryDir = path.join(__dirname, 'zss', 'memory')
const files = fs
  .readdirSync(memoryDir)
  .filter((f) => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts')
  .map((f) => path.join(memoryDir, f))

console.log(`Found ${files.length} files to process\n`)

files.forEach(processFile)

console.log('\n✓ Done!')
