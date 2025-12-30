export function phonemize(
  text: string,
  language?: string,
): Promise<string[]>

export function list_voices(
  language?: string,
): Promise<
  Array<{
    name: string
    identifier: string
    languages: Array<{ name: string; priority: number }>
  }>
>

