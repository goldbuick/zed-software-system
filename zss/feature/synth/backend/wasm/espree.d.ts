declare module 'espree' {
  export function parse(
    code: string,
    options?: {
      ecmaVersion?: number
      sourceType?: 'script' | 'module'
      loc?: boolean
    },
  ): unknown
}
