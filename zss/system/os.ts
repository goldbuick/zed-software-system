import { GeneratorBuild, compile } from 'zss/lang/generator'
import { createGuid } from 'zss/mapping/guid'
import { MESSAGE_FUNC, parseTarget } from 'zss/network/device'

import { CHIP, MESSAGE, createChip } from './chip'
import { loadFirmware } from './firmware/loader'

export type OS = {
  boot: (opts: { group: string; firmware: string[]; code: string }) => string
  ids: () => string[]
  halt: (id: string) => boolean
  haltGroup: (group: string) => boolean[]
  pauseGroup: (group: string) => void
  resumeGroup: (group: string) => void
  activeGroups: () => string[]
  tick: () => void
  message: MESSAGE_FUNC
  messageForGroup: (group: string, message: MESSAGE) => void
}

export function createOS() {
  const builds: Record<string, GeneratorBuild> = {}
  const chips: Record<string, CHIP> = {}
  const groups: Record<string, Set<CHIP>> = {}
  const activegroups: Record<string, boolean> = {}

  function build(code: string) {
    const cache = builds[code]
    if (cache) {
      return cache
    }

    const result = compile(code)
    builds[code] = result

    return result
  }

  const os: OS = {
    boot(opts) {
      const id = createGuid()
      const group = opts.group.toLowerCase()

      const result = build(opts.code)
      if (result.errors?.length) {
        // log it ???
        console.error(result)
        return ''
      }

      // create chip from build and load
      const chip = (chips[id] = createChip(id, group, result))
      opts.firmware.forEach((item) => loadFirmware(chip, item))

      // make sure we have a set to add to
      if (!groups[group]) {
        groups[group] = new Set()
      }

      // add to group and return id
      groups[group].add(chip)
      return id
    },
    ids() {
      return Object.keys(chips)
    },
    halt(id) {
      const chip = chips[id]
      if (chip) {
        delete chips[id]
        groups[chip.group()]?.delete(chip)
      }
      return !!chip
    },
    haltGroup(group) {
      const chips = groups[group]
      return [...(chips ?? [])].map((chip) => os.halt(chip.id()))
    },
    tick() {
      os.activeGroups().forEach((group) => {
        const chips = groups[group]
        chips?.forEach((chip) => chip.tick())
      })
    },
    pauseGroup(group) {
      delete activegroups[group]
    },
    resumeGroup(group) {
      activegroups[group] = true
    },
    activeGroups() {
      return Object.keys(activegroups)
    },
    message(incoming) {
      const { target, path } = parseTarget(incoming.target)
      const itarget = target.toLowerCase()

      // check group
      if (groups[itarget]) {
        os.messageForGroup(itarget, { ...incoming, target: path })
      }

      // check id / name
      os.ids().forEach((id) => {
        if (target === id) {
          chips[id].message({ ...incoming, target: path })
        }
      })
    },
    messageForGroup(groupName, incoming) {
      const { target, path } = parseTarget(incoming.target)

      // match against chips in group
      const group = groups[groupName]
      group.forEach((chip) => {
        if (target === chip.id()) {
          chip.message({ ...incoming, target: path })
        }
      })
    },
  }

  return os
}
