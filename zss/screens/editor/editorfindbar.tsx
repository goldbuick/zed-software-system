import { useEditor } from 'zss/gadget/data/zustandstores'
import { writetile } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { metakey } from 'zss/words/system'
import { textformatreadedges } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

export type EditorFindBarProps = {
  matchcount: number
  matchindex: number
}

function clipfield(value: string, width: number, cursor: number): string {
  if (value.length <= width) {
    return value.padEnd(width, ' ')
  }
  const half = Math.max(1, Math.floor(width / 2))
  const start = clamp(cursor - half, 0, Math.max(0, value.length - width))
  return value.slice(start, start + width)
}

function drawline(
  y: number,
  left: number,
  right: number,
  text: string,
  context: ReturnType<typeof useWriteText>,
  fg: COLOR,
  bg: COLOR,
) {
  const width = right - left + 1
  const clipped = text.slice(0, width).padEnd(width, ' ')
  for (let i = 0; i < clipped.length; ++i) {
    writetile(context, context.width, context.height, left + i, y, {
      char: clipped.charCodeAt(i),
      color: fg,
      bg,
    })
  }
}

function drawfieldsegment(
  y: number,
  x: number,
  text: string,
  active: boolean,
  context: ReturnType<typeof useWriteText>,
) {
  for (let i = 0; i < text.length; ++i) {
    writetile(context, context.width, context.height, x + i, y, {
      char: text.charCodeAt(i),
      color: active ? COLOR.BLACK : COLOR.WHITE,
      bg: active ? COLOR.YELLOW : COLOR.DKBLUE,
    })
  }
}

export function EditorFindBar({ matchcount, matchindex }: EditorFindBarProps) {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const find = useEditor(
    useShallow((state) => ({
      findopen: state.findopen,
      findquery: state.findquery,
      replacequery: state.replacequery,
      findfield: state.findfield,
      findcasesensitive: state.findcasesensitive,
      findfieldcursor: state.findfieldcursor,
    })),
  )

  if (!find.findopen) {
    return null
  }

  const findy = edge.bottom - 1
  const replacey = edge.bottom
  const left = edge.left + 1
  const right = edge.right - 1
  const width = Math.max(8, right - left + 1)
  const caseflag = find.findcasesensitive ? 'Aa' : 'aa'
  const countlabel =
    matchcount === 0 ? '0/0' : `${Math.max(1, matchindex + 1)}/${matchcount}`

  const findlabel = 'Find: '
  const findsuffix = ` ${countlabel} [${caseflag}] ent/s+ent alt+c`
  const findfieldw = Math.max(4, width - findlabel.length - findsuffix.length)
  const findshown = clipfield(find.findquery, findfieldw, find.findfieldcursor)
  const findactive = find.findfield === 'find'

  drawline(
    findy,
    left,
    right,
    ' '.repeat(width),
    context,
    COLOR.LTGRAY,
    COLOR.DKBLUE,
  )
  drawline(
    findy,
    left,
    left + findlabel.length - 1,
    findlabel,
    context,
    findactive ? COLOR.WHITE : COLOR.LTGRAY,
    COLOR.DKBLUE,
  )
  drawfieldsegment(
    findy,
    left + findlabel.length,
    findshown,
    findactive,
    context,
  )
  drawline(
    findy,
    left + findlabel.length + findfieldw,
    right,
    findsuffix,
    context,
    COLOR.WHITE,
    COLOR.DKBLUE,
  )

  const replacelabel = 'Repl: '
  const replacesuffix = ` tab ${metakey}+ent=1 ${metakey}+alt+ent=all`
  const replacefieldw = Math.max(
    4,
    width - replacelabel.length - replacesuffix.length,
  )
  const replaceshown = clipfield(
    find.replacequery,
    replacefieldw,
    find.findfieldcursor,
  )
  const replaceactive = find.findfield === 'replace'

  drawline(
    replacey,
    left,
    right,
    ' '.repeat(width),
    context,
    COLOR.LTGRAY,
    COLOR.DKBLUE,
  )
  drawline(
    replacey,
    left,
    left + replacelabel.length - 1,
    replacelabel,
    context,
    replaceactive ? COLOR.WHITE : COLOR.LTGRAY,
    COLOR.DKBLUE,
  )
  drawfieldsegment(
    replacey,
    left + replacelabel.length,
    replaceshown,
    replaceactive,
    context,
  )
  drawline(
    replacey,
    left + replacelabel.length + replacefieldw,
    right,
    replacesuffix,
    context,
    COLOR.LTGRAY,
    COLOR.DKBLUE,
  )

  return null
}
