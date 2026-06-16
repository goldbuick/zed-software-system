import { apitoast, vmpublish } from 'zss/device/api'
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
  znslist,
  znslogincode,
  znsnormalizepathkey,
  znspersistlogin,
  znsread,
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
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadfirstcontentbook,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
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
  const sorted = memorylistcodepagessorted(book)
  const pagelines = sorted.map((page) => {
    const name = memoryreadcodepagename(page)
    const type = memoryreadcodepagetypeasstring(page)
    const prefix = memorycodepagetoprefix(page)
    return zsszedlinkline(
      `zns code ${page.id}`,
      `$greenPublish $blue[${type}] ${prefix}$white${name}`,
    )
  })
  terminalwritelines(SOFTWARE, player, zsstexttape(...pagelines))
}

async function znslistall(email: string, token: string) {
  const result = await znslist(email, token)
  if (!result.success || !isarray(result.list)) {
    return []
  }
  return result.list
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
          zssheaderlines('ZNS'),
          zsstextline(
            `session: $yellowpending login for $green${pendingemail}`,
          ),
          zsssectionlines('Actions'),
          zsszedlinkline('zns restart', 'Restart / Cancel'),
          zsstextline('$GRAYtype $green#zns <code>$GRAY in cli'),
        ),
      )
      return
    }
    showznsloginguide(player)
    return
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const list = memoryreadbooklist()
  const booklinks = list.map((book) =>
    zsszedlinkline(`zns book ${book.id}`, book.name),
  )

  const all = await znslistall(session.email, session.token)
  console.info(all)

  const publishedrows = all
    .sort((a: any, b: any) => {
      const { kind: kinda = '' } = a.metadata ?? {}
      const { kind: kindb = '' } = b.metadata ?? {}
      if (kinda === kindb) {
        return a.key.localeCompare(b.key)
      }
      return kinda.localeCompare(kindb)
    })
    .map((row: any) => {
      const { kind = '' } = row.metadata ?? {}
      switch (kind) {
        case 'text': {
          return zsszedlinkline(
            `zns import ${row.key}`,
            `$greenImport ${row.key}`,
          )
        }
        case 'bytes': {
          return zsszedlinkline(
            `openit https://bytes.zed.cafe/${row.value}`,
            `${row.key}`,
          )
        }
        default: {
          return []
        }
      }
    })

  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(
      zssheaderlines('ZNS'),
      zsstextline(`session: $green${session.email} @ ${session.namespace}`),
      '$32',
      zsssectionlines('Actions'),
      zsszedlinkline('zns restart', 'Logout'),
      ispresent(mainbook)
        ? zsszedlinkline(
            'zns bytes',
            `$greenPublish $white${mainbook.name} bytes`,
          )
        : [],
      '$32',
      zsssectionlines('List codepages to publish'),
      booklinks.length > 0 ? booklinks : [zsstextline('$GRAY(none)')],
      '$32',
      zsssectionlines(`Published content`),
      publishedrows.length > 0 ? publishedrows : [zsstextline('$GRAY(none)')],
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
        'zns-code',
        session.email,
        session.token,
        znskey,
        maybecodepage.code,
      )
      break
    }
    case 'bytes': {
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      if (!ispresent(mainbook)) {
        write(SOFTWARE, player, zsstextline(`$red main book not found`))
        return
      }
      const znskey = znsnormalizepathkey(mainbook.name)
      if (!znskey) {
        write(SOFTWARE, player, zsstextline(`$red invalid zns key for bytes`))
        return
      }
      vmpublish(
        SOFTWARE,
        player,
        'zns-bytes',
        session.email,
        session.token,
        znskey,
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
  const row = await znsread(session.namespace, key)
  const text = row.value ?? ''
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
