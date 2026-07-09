import type { DEVICE } from 'zss/device'
import {
  apierror,
  registerterminalfull,
  vmbooks,
  vmcli,
  vmzsswords,
  workstatus,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import {
  ZssTerminalBookmark,
  readbookmarksfromstorage,
  readterminalbookmarkdisplaylines,
} from 'zss/feature/bookmarks'
import { fetchrefscrolltext } from 'zss/feature/fetchrefscrolltext'
import { terminalwritemarkdownlines } from 'zss/feature/parse/markdownterminal'
import { write } from 'zss/feature/writeui'
import { zsstextline } from 'zss/feature/zsstextui'
import { useTape } from 'zss/gadget/data/zustandstores'
import { waitfor } from 'zss/mapping/tick'
import { BOOK } from 'zss/memory/types'

export async function syncterminalbookmarkpins(): Promise<void> {
  const blob = await readbookmarksfromstorage()
  const pinlines = readterminalbookmarkdisplaylines(blob)
  const pinids = blob.terminal.map((b: ZssTerminalBookmark) => b.id)
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      pinlines,
      pinids,
    },
  }))
}

export async function writeclilink(device: DEVICE): Promise<void> {
  const player = registerreadplayer()
  workstatus(device, player, 'cli help')
  try {
    const markdowntext = await fetchrefscrolltext('cliscroll')
    if (markdowntext.trim()) {
      terminalwritemarkdownlines(player, markdowntext)
    } else {
      apierror(device, player, 'help', 'cli doc not found')
    }
  } catch (err: any) {
    apierror(device, player, 'help', err?.message ?? err)
  }
}

export async function writehelphint(device: DEVICE): Promise<void> {
  await waitfor(1000)
  write(
    device,
    registerreadplayer(),
    zsstextline(`try typing $green#help$blue and pressing enter!`),
  )
}

export function writepages(device: DEVICE): void {
  vmcli(device, registerreadplayer(), '#pages')
}

export async function loadmem(
  device: DEVICE,
  books: string | BOOK[],
): Promise<void> {
  if (!books || books.length === 0) {
    const player = registerreadplayer()
    apierror(device, player, 'content', 'no content found')
    await writeclilink(device)
    vmzsswords(device, player)
    registerterminalfull(device, player)
    await writehelphint(device)
    return
  }
  vmbooks(device, registerreadplayer(), books)
}
