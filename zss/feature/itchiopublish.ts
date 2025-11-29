import { saveAs } from 'file-saver'
import JSZip from 'jszip'

export async function itchiopublish(filename: string, exportedbooks: string) {
  const zip = new JSZip()
  zip.file(
    `index.html`,
    `<!doctype html>
      <html lang=en>
      <head>
      <meta charset=utf-8>
      <title>...adding bytes</title>
      </head>
      <body>
      <script>location = 'https://zed.cafe/#${exportedbooks}';</script>
      </body>
    </html>`,
  )
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${filename}.zip`)
}
