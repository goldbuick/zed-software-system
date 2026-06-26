import { type GeneratorBuild, compile } from './backend/typescript/generator'

export function compilescript(name: string, text: string): GeneratorBuild {
  const label = `compile-${name}`
  // eslint-disable-next-line no-console
  console.time(label)
  try {
    return compile(name, text)
  } finally {
    // eslint-disable-next-line no-console
    console.timeEnd(label)
  }
}
