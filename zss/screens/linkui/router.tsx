import { NAME } from 'zss/words/types'

import { LinkCharEdit } from './charedit'
import { LinkColorEdit } from './coloredit'
import { LinkCopyIt } from './copyit'
import { LinkHotkey } from './hotkey'
import { LinkHyperlink } from './hyperlink'
import { LinkNumber } from './number'
import { LinkOpenIt } from './openit'
import { LinkRange } from './range'
import { LinkRunIt } from './runit'
import { LinkSelect } from './select'
import { LinkText } from './text'
import type { LinkSurface } from './types'
import { LinkViewIt } from './viewit'
import { LinkZSSEdit } from './zssedit'

type LinkRouterProps = {
  linktype: string
  surface: LinkSurface
}

export function LinkRouter({ linktype, surface }: LinkRouterProps) {
  switch (NAME(linktype)) {
    case 'copyit':
      return <LinkCopyIt surface={surface} />
    case 'openit':
      return <LinkOpenIt surface={surface} />
    case 'viewit':
      return <LinkViewIt surface={surface} />
    case 'runit':
      return <LinkRunIt surface={surface} />
    case 'hk':
    case 'hotkey':
      return <LinkHotkey surface={surface} />
    case 'rn':
    case 'range':
      return <LinkRange surface={surface} />
    case 'sl':
    case 'select':
      return <LinkSelect surface={surface} />
    case 'nm':
    case 'number':
      return <LinkNumber surface={surface} />
    case 'tx':
    case 'text':
      return <LinkText surface={surface} />
    case 'zssedit':
      return <LinkZSSEdit surface={surface} />
    case 'charedit':
      return <LinkCharEdit surface={surface} />
    case 'coloredit':
      return <LinkColorEdit surface={surface} isbg={false} />
    case 'bgedit':
      return <LinkColorEdit surface={surface} isbg={true} />
    default:
    case 'hyperlink':
      return <LinkHyperlink surface={surface} />
  }
}
