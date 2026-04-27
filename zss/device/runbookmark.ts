import { type DEVICELIKE, apitoast, vmpage } from 'zss/device/api'
import { readbookmarksfromstorage } from 'zss/feature/bookmarks'
import { waitfor } from 'zss/mapping/tick'

export async function runbookmarkurlnavigate(
  device: DEVICELIKE,
  player: string,
  href: string,
): Promise<void> {
  apitoast(device, player, `navigating to $green${href}`)
  await waitfor(1000)
  window.location.href = href.trim()
}

export async function runbookmarkcopytogame(
  device: DEVICELIKE,
  player: string,
  id: string,
): Promise<void> {
  const blob = await readbookmarksfromstorage()
  const entry = blob.editor.find((b) => b.id === id)
  if (!entry) {
    return
  }
  // get code & content from codepage

  const { code, stats, ...content } = entry.codepage
  // create new codepage
  apitoast(
    device,
    player,
    `copying to main $green@${entry.type} ${entry.title}`,
  )
  await waitfor(1000)
  vmpage(device, player, { code, ...content })
}
