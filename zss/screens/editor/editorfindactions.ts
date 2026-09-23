import { useEditor } from 'zss/gadget/data/zustandstores'
import { clamp } from 'zss/mapping/number'

import {
  type EDITOR_FIND_MATCH,
  editorfindmatches,
  editorfindmatchindex,
  editorfindnext,
  editorfindprev,
  editorreplaceall,
} from './editorfind'

export function editorfindopenbar(
  focus: 'find' | 'replace',
  seedquery?: string,
) {
  const seeded =
    typeof seedquery === 'string' && seedquery.length > 0
      ? seedquery
      : undefined
  useEditor.setState((state) => ({
    findopen: true,
    findfield: focus,
    findquery: seeded ?? state.findquery,
    findfieldcursor: (seeded ?? state.findquery).length,
    findmatchindex: -1,
  }))
}

export function editorfindclosebar() {
  useEditor.setState({ findopen: false })
}

export function editorfindselectmatch(
  match: EDITOR_FIND_MATCH,
  matchindex: number,
  updatescrolling: (cursor: number) => void,
) {
  updatescrolling(match.end)
  useEditor.setState({
    cursor: match.end,
    select: match.start,
    findmatchindex: matchindex,
  })
}

export function editorfindjump(
  text: string,
  direction: 'next' | 'prev',
  fromcursor: number,
  updatescrolling: (cursor: number) => void,
) {
  const state = useEditor.getState()
  const matches = editorfindmatches(
    text,
    state.findquery,
    state.findcasesensitive,
  )
  if (matches.length === 0) {
    useEditor.setState({ findmatchindex: -1 })
    return
  }
  // Selection spans the current match (select..cursor). Next starts at end;
  // prev at start so we do not re-pick the same hit.
  let from = fromcursor
  if (typeof state.select === 'number') {
    const start = Math.min(state.cursor, state.select)
    const end = Math.max(state.cursor, state.select)
    from = direction === 'next' ? end : start
  }
  const match =
    direction === 'next'
      ? editorfindnext(matches, from)
      : editorfindprev(matches, from)
  if (!match) {
    return
  }
  const index = matches.findIndex(
    (m) => m.start === match.start && m.end === match.end,
  )
  editorfindselectmatch(match, index, updatescrolling)
}

export function editorfindactivetext(): string {
  const state = useEditor.getState()
  return state.findfield === 'find' ? state.findquery : state.replacequery
}

export function editorfindsetactivetext(value: string, cursor: number) {
  const state = useEditor.getState()
  const nextcursor = clamp(cursor, 0, value.length)
  if (state.findfield === 'find') {
    useEditor.setState({
      findquery: value,
      findfieldcursor: nextcursor,
      findmatchindex: -1,
    })
  } else {
    useEditor.setState({
      replacequery: value,
      findfieldcursor: nextcursor,
    })
  }
}

export function editorfindinsertchar(ch: string) {
  const state = useEditor.getState()
  const text = editorfindactivetext()
  const c = clamp(state.findfieldcursor, 0, text.length)
  editorfindsetactivetext(text.slice(0, c) + ch + text.slice(c), c + ch.length)
}

export function editorfindbackspace() {
  const state = useEditor.getState()
  const text = editorfindactivetext()
  const c = clamp(state.findfieldcursor, 0, text.length)
  if (c <= 0) {
    return
  }
  editorfindsetactivetext(text.slice(0, c - 1) + text.slice(c), c - 1)
}

export function editorfinddelete() {
  const state = useEditor.getState()
  const text = editorfindactivetext()
  const c = clamp(state.findfieldcursor, 0, text.length)
  if (c >= text.length) {
    return
  }
  editorfindsetactivetext(text.slice(0, c) + text.slice(c + 1), c)
}

export function editorfindmovefieldcursor(delta: number) {
  const state = useEditor.getState()
  const text = editorfindactivetext()
  useEditor.setState({
    findfieldcursor: clamp(state.findfieldcursor + delta, 0, text.length),
  })
}

export function editorfindtogglefield() {
  useEditor.setState((state) => {
    const next = state.findfield === 'find' ? 'replace' : 'find'
    const text = next === 'find' ? state.findquery : state.replacequery
    return {
      findfield: next,
      findfieldcursor: text.length,
    }
  })
}

export function editorfindreplacecurrent(
  text: string,
  strvaluesplice: (index: number, count: number, insert?: string) => void,
  updatescrolling: (cursor: number) => void,
) {
  const state = useEditor.getState()
  if (state.findquery.length === 0) {
    return
  }
  const matches = editorfindmatches(
    text,
    state.findquery,
    state.findcasesensitive,
  )
  let index = state.findmatchindex
  if (index < 0 || index >= matches.length) {
    index = editorfindmatchindex(matches, state.cursor, state.select)
  }
  if (index < 0 || index >= matches.length) {
    editorfindjump(text, 'next', state.cursor, updatescrolling)
    return
  }
  const match = matches[index]
  strvaluesplice(match.start, match.end - match.start, state.replacequery)
  const after =
    text.slice(0, match.start) + state.replacequery + text.slice(match.end)
  const nextfrom = match.start + state.replacequery.length
  editorfindjump(after, 'next', nextfrom, updatescrolling)
}

export function editorfindreplacealltext(
  text: string,
  strvaluesplice: (index: number, count: number, insert?: string) => void,
) {
  const state = useEditor.getState()
  if (state.findquery.length === 0) {
    return
  }
  const { text: next, count } = editorreplaceall(
    text,
    state.findquery,
    state.replacequery,
    state.findcasesensitive,
  )
  if (count === 0) {
    return
  }
  strvaluesplice(0, text.length, next)
  useEditor.setState({ findmatchindex: -1, select: undefined, cursor: 0 })
}
