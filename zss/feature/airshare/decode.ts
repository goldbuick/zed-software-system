import {
  prepareZXingModule,
  readBarcodes,
} from 'zxing-wasm/reader'
import zxingwasmurl from 'zxing-wasm/reader/zxing_reader.wasm?url'

let zxingready: Promise<void> | undefined

export async function ensureairsharezxing(): Promise<void> {
  if (!zxingready) {
    zxingready = (async () => {
      await prepareZXingModule({
        fireImmediately: true,
        overrides: {
          locateFile: (path: string, prefix: string) => {
            if (path.endsWith('.wasm')) {
              return zxingwasmurl
            }
            return `${prefix}${path}`
          },
        },
      })
    })()
  }
  await zxingready
}

/** Decode QR binaries from a camera ImageData frame. */
export async function airsharereadqrbytes(
  imagedata: ImageData,
): Promise<Uint8Array[]> {
  await ensureairsharezxing()
  const results = await readBarcodes(imagedata, {
    formats: ['QRCode'],
    tryHarder: true,
    maxNumberOfSymbols: 4,
  })
  const out: Uint8Array[] = []
  for (let i = 0; i < results.length; ++i) {
    const bytes = results[i].bytes
    if (bytes && bytes.length > 0) {
      out.push(bytes)
    }
  }
  return out
}
