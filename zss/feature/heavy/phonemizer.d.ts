export function phonemize(text: string, language?: string): Promise<string[]>

export function list_voices(language?: string): Promise<
  {
    name: string
    identifier: string
    languages: { name: string; priority: number }[]
  }[]
>
