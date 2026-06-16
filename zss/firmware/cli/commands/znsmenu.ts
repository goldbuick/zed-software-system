import { parsetarget } from 'zss/device'
import { apitoast, vmpublish } from 'zss/device/api'
import { modemreadtextsync } from 'zss/device/modem'
import { SOFTWARE } from 'zss/device/session'
import { rundeeplinks } from 'zss/feature/deeplink'
import {
  storagereadznsemail,
  storagereadznsnamespace,
  storagereadznssession,
  storagereadznstoken,
} from 'zss/feature/storage'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  ZNS_BYTES_KEY_TARGET,
  fetchznstext,
  znskeyispeer,
  znskeylinkcommand,
  znskeyopenlabel,
  znslist,
  znslogincode,
  znsnormalizepathkey,
  znspersistlogin,
} from 'zss/feature/url'
import { write } from 'zss/feature/writeui'
import {
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'
import { isarray, ispresent } from 'zss/mapping/types'
import {
  memorylistcodepagessorted,
  memoryreadcodepage,
  memorywritecodepage,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadcodepagebyaddress } from 'zss/memory/codepages'
import { memorycodepagetoprefix } from 'zss/memory/rendering'
import {
  memoryreadbookbyaddress,
  memoryreadbooklist,
  memoryreadfirstbook,
  memoryreadfirstcontentbook,
} from 'zss/memory/session'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME, WORD } from 'zss/words/types'

type ZNS_SESSION = { email: string; token: string; namespace: string }

export async function znsreadsession(): Promise<ZNS_SESSION | undefined> {
  const session = await storagereadznssession()
  if (session) {
    return session
  }
  const email = await storagereadznsemail()
  const token = await storagereadznstoken()
  const namespace = await storagereadznsnamespace()
  if (email && token && namespace) {
    return { email, token, namespace }
  }
  return undefined
}

export function showznsloginguide(player: string) {
  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(
      zsssectionlines('login'),
      zsstextline('type $green#zns <email> <namespace>'),
    ),
  )
}

function showznsbytespublishform(player: string) {
  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(),
    // zsstextline('$WHITEzns publish bytes'),
    // ...zsssectionlines('Key'),
    // zsszedlinkline(`${ZNS_BYTES_KEY_TARGET} text`, 'Key'),
    // zsszedlinkline('zns publish bytes submit', 'Publish Bytes'),
  )
}

function showznspublishbookmenu(player: string, address: string) {
  const book = memoryreadbookbyaddress(address)
  if (!ispresent(book)) {
    write(SOFTWARE, player, zsstextline(`$red book not found: ${address}`))
    return
  }
  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(zssheaderlines(book.name), zsssectionlines('Pages')),
  )
  //
  // const sorted = memorylistcodepagessorted(book)
  // const pagelines = sorted.map((page) => {
  //   const name = memoryreadcodepagename(page)
  //   const type = memoryreadcodepagetypeasstring(page)
  //   const prefix = memorycodepagetoprefix(page)
  //   return zsszedlinkline(
  //     `zns code ${address} ${page.id}`,
  //     `$blue[${type}] ${prefix}$white${name}`,
  //   )
  // })
  // terminalwritelines(SOFTWARE, player, zsstexttape(...pagelines))
}

async function znsmenukeyrows(session: ZNS_SESSION): Promise<string[]> {
  const result = await znslist(session.email, session.token)
  if (!result.success || !isarray(result.list)) {
    return []
  }
  const rows: string[] = []
  for (let i = 0; i < result.list.length; ++i) {
    const row = result.list[i]
    const kind = row.metadata?.kind as string | undefined
    if (znskeyispeer(row.key, kind)) {
      continue
    }
    const label = znskeyopenlabel(row.key, row.value, kind)
    const command = znskeylinkcommand(
      session.namespace,
      row.key,
      row.value,
      kind,
    )
    rows.push(zsszedlinkline(command, label))
  }
  return rows
}

export async function showznsmenu(player: string) {
  if (await rundeeplinks({ player, surface: 'menu' })) {
    return
  }
  const session = await znsreadsession()
  if (!session?.token) {
    const pendingemail = await storagereadznsemail()
    if (pendingemail) {
      terminalwritelines(
        SOFTWARE,
        player,
        zsstexttape(
          zsstextline('$WHITEzns (menu)'),
          zsstextline(
            `session: $yellowpending login for $green${pendingemail}`,
          ),
          ...zsssectionlines('Actions'),
          zsszedlinkline('zns restart', 'Restart / Cancel'),
          zsstextline('$GRAYtype $green#zns <code>$GRAY in cli'),
        ),
      )
      return
    }
    showznsloginguide(player)
    return
  }
  const list = memoryreadbooklist()
  const booklinks = list.map((book) =>
    zsszedlinkline(`zns book ${book.id}`, book.name),
  )
  const keyrows = await znsmenukeyrows(session)

  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(
      zssheaderlines('ZNS'),
      zsstextline(`session: $green${session.email} @ ${session.namespace}`),
      zsssectionlines('Actions'),
      zsszedlinkline('zns restart', 'Logout'),
      zsszedlinkline('zns bytes', 'Publish Bytes'),
      zsssectionlines('Books'),
      booklinks.length > 0 ? booklinks : [zsstextline('$GRAY(none)')],
      zsssectionlines('Uploads'),
      keyrows.length > 0 ? keyrows : [zsstextline('$GRAY(none)')],
    ),
  )
}

export function znsrunpublish(
  words: WORD[],
  start: number,
  session: ZNS_SESSION,
) {
  const player = READ_CONTEXT.elementfocus
  const [mode, iii] = readargs(words, start, [ARG_TYPE.MAYBE_NAME])
  const modename = NAME(mode)
  switch (modename) {
    case 'book': {
      const [address] = readargs(words, iii, [ARG_TYPE.MAYBE_NAME])
      if (!address) {
        write(SOFTWARE, player, zsstextline(`$red missing book address`))
        return
      }
      showznspublishbookmenu(player, address)
      break
    }
    case 'code': {
      const [address] = readargs(words, iii, [ARG_TYPE.MAYBE_NAME])
      if (!address) {
        write(SOFTWARE, player, zsstextline(`$red missing codepage address`))
        return
      }
      const maybecodepage = memoryreadcodepagebyaddress(address)
      if (!ispresent(maybecodepage)) {
        write(
          SOFTWARE,
          player,
          zsstextline(`$red codepage not found: ${address}`),
        )
        return
      }
      const znskey = znsnormalizepathkey(memoryreadcodepagename(maybecodepage))
      if (!znskey) {
        write(
          SOFTWARE,
          player,
          zsstextline(`$red invalid zns key for codepage`),
        )
        return
      }
      vmpublish(
        SOFTWARE,
        player,
        'zns-text',
        session.email,
        session.token,
        znskey,
        target,
        path,
      )
      break
    }
    case 'bytes': {
      const [filename, iiii] = readargs(words, iii, [ARG_TYPE.MAYBE_NAME])
      let keyname = NAME(filename)
      if (!keyname) {
        showznsbytespublishform(player)
        return
      }
      if (keyname === 'submit') {
        keyname = modemreadtextsync(ZNS_BYTES_KEY_TARGET).trim()
      }
      const slug = znsnormalizepathkey(keyname)
      if (!slug) {
        write(
          SOFTWARE,
          player,
          zsstextline(
            `$red invalid zns key — use lowercase letters, numbers, hyphens`,
          ),
        )
        return
      }
      const [tags] = readargsuntilend(words, iiii, ARG_TYPE.NAME)
      vmpublish(
        SOFTWARE,
        player,
        'zns',
        session.email,
        session.token,
        slug,
        ...tags,
      )
      break
    }
    default:
      write(SOFTWARE, player, zsstextline(`$red invalid mode: ${modename}`))
      return
  }
}

export async function znsrunimportcode(
  words: WORD[],
  start: number,
  session: ZNS_SESSION,
) {
  const [mode, iii] = readargs(words, start, [ARG_TYPE.NAME])
  if (NAME(mode) !== 'code') {
    return
  }
  const [keyarg] = readargs(words, iii, [ARG_TYPE.NAME])
  const key = NAME(keyarg)
  const player = READ_CONTEXT.elementfocus
  if (!key) {
    write(SOFTWARE, player, zsstextline(`$red missing zns key`))
    return
  }
  const text = await fetchznstext(session.namespace, key)
  if (!text.trim()) {
    write(SOFTWARE, player, zsstextline(`$red zns code not found: ${key}`))
    return
  }
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    write(SOFTWARE, player, zsstextline(`$red no content book to import into`))
    return
  }
  const codepage = memorycreatecodepage(text, {})
  memorywritecodepage(contentbook, codepage)
  const name = memoryreadcodepagename(codepage)
  apitoast(SOFTWARE, player, `imported $green${name} from zns [code] ${key}`)
}

export async function znsconfirmotpfromdeeplink(
  player: string,
  email: string,
  code: string,
  namespace: string,
) {
  write(SOFTWARE, player, zsstextline(`confirming login with $green${code}`))
  const result = await znslogincode(email, code)
  if (result.success && result.token) {
    await znspersistlogin(email, namespace, result.token)
    await showznsmenu(player)
    return true
  }
  write(SOFTWARE, player, zsstextline(`$red zns login failed`))
  return false
}

export async function znsrequiresession(player: string) {
  const session = await znsreadsession()
  if (!session) {
    write(
      SOFTWARE,
      player,
      zsstextline(
        `please login with $green#zns <email> <namespace>$blue first`,
      ),
    )
    return undefined
  }
  return session
}
