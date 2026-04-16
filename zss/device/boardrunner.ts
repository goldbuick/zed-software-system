import { createdevice } from 'zss/device'
import { jsonsyncreadreceiverstate } from 'zss/device/jsonsync'

function boardrunnerlogjsonsyncstreams() {
  const { streams } = jsonsyncreadreceiverstate()
  if (streams.size === 0) {
    return
  }
  const parts: string[] = []
  streams.forEach((state, streamid) => {
    const doc = state.document
    let boardhint = ''
    if (
      typeof doc === 'object' &&
      doc !== null &&
      'id' in doc &&
      typeof (doc as { id: unknown }).id === 'string'
    ) {
      const b = doc as { id: string; name?: string }
      boardhint = b.name ? `${b.id}(${b.name})` : b.id
    }
    parts.push(
      `${streamid} nextseq=${state.expectednextseq}${boardhint ? ` board=${boardhint}` : ''}`,
    )
  })
  console.info(`[boardrunner] jsonsync ${parts.join(' | ')}`)
}

const boardrunner = createdevice('boardrunner', ['second'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }
  switch (message.target) {
    case 'second':
      boardrunnerlogjsonsyncstreams()
      break
    default:
      break
  }
})
