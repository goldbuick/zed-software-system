/**
 * Ink-based terminal UI for the ZSS server REPL.
 * Renders a scrollable log area with a styled input prompt.
 */
import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

const PROMPT = 'zed.cafe> '
const MAX_LOG_LINES = 200
const PROMPT_COLOR = 'magenta'

export type ServerAppProps = {
  onSubmit: (line: string) => void
  onLogOutput: (fn: (line: string) => void) => void
  onReady: () => void | Promise<void>
}

export function ServerApp({
  onSubmit,
  onLogOutput,
  onReady,
}: ServerAppProps) {
  const [logLines, setLogLines] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    onLogOutput((line: string) => {
      setLogLines((prev) => {
        const next = [...prev, line]
        return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next
      })
    })
    setMounted(true)
    void Promise.resolve(onReady())
  }, [onLogOutput, onReady])

  const handleSubmit = (value: string) => {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      onSubmit(trimmed)
    }
    setInput('')
  }

  return (
    <Box flexDirection="column" paddingX={0}>
      <Box
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
        minHeight={10}
        paddingY={0}
      >
        <Box flexDirection="column">
          {logLines.length === 0 && !mounted ? (
            <Text dimColor>Starting...</Text>
          ) : (
            logLines.map((line, i) => (
              <Text key={`${i}-${line.slice(0, 30)}`}>{line}</Text>
            ))
          )}
        </Box>
      </Box>

      <Box marginTop={0} flexDirection="row" paddingX={0}>
        <Text color={PROMPT_COLOR} bold>{PROMPT}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="type a command..."
          showCursor
        />
      </Box>
    </Box>
  )
}
