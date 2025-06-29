import rexpaintjs from 'rexpaintjs'

export function parserexpaint(player: string, content: Uint8Array) {
  // Callback form
rexpaintjs.fromBuffer(yourBuffer, (err, data) => {
  ...
})
}
