import { objectKeys } from 'ts-extras'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  DRIVER_TYPE,
  firmwaregetcommandargs,
  firmwarelistcommands,
} from 'zss/firmware/runner'
import { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { memoryreadcodepagename } from 'zss/memory/codepageoperations'
import { memorylistallcodepagewithtype } from 'zss/memory/codepages'
import { memoryreadflags } from 'zss/memory/flags'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { CATEGORY_CONSTS } from 'zss/words/category'
import { collisionconsts } from 'zss/words/collision'
import { colorconsts } from 'zss/words/color'
import { DIR_CONSTS } from 'zss/words/dir'
import { ARG_TYPE } from 'zss/words/types'

import {
  STATS_BOARD,
  STATS_BOOLEAN,
  STATS_CONFIG,
  STATS_HELPER,
  STATS_INTERACTION,
  STATS_SENDER,
} from '../state'

const dirmods = [
  'cw',
  'ccw',
  'oop',
  'rndp',
  'to',
  'over',
  'under',
  'ground',
  'within',
  'awayby',
  'elements',
]

export function handlezsswords(vm: DEVICE, message: MESSAGE): void {
  const langcommands: GADGET_ZSS_WORDS['langcommands'] = {
    if: [ARG_TYPE.ANY, 'conditional logic'],
    try: [ARG_TYPE.ANY, 'try moving with a fallback command'],
    give: [ARG_TYPE.NAME, ARG_TYPE.ANY, 'give the value'],
    take: [ARG_TYPE.NAME, ARG_TYPE.ANY, 'take the value'],
    else: ['else/else if branch of a conditional logic'],
    repeat: [ARG_TYPE.NUMBER, 'repeat the loop this many times'],
    while: [ARG_TYPE.ANY, 'loop until the condition is false'],
    foreach: [
      ARG_TYPE.NAME,
      ARG_TYPE.ANY,
      ARG_TYPE.ANY,
      'iterate over a list of values',
    ],
    break: ['break out of the current loop'],
    continue: ['skip to the next iteration'],
    do: ['start of a do-done block'],
    done: ['end of a do-done block'],
  }
  const clicommands: GADGET_ZSS_WORDS['clicommands'] = {}
  const loadercommands: GADGET_ZSS_WORDS['loadercommands'] = {}
  const runtimecommands: GADGET_ZSS_WORDS['runtimecommands'] = {}
  for (const cmd of firmwarelistcommands(DRIVER_TYPE.CLI)) {
    const sig = firmwaregetcommandargs(DRIVER_TYPE.CLI, cmd)
    if (ispresent(sig)) {
      clicommands[cmd] = sig
    }
  }
  for (const cmd of firmwarelistcommands(DRIVER_TYPE.LOADER)) {
    const sig = firmwaregetcommandargs(DRIVER_TYPE.LOADER, cmd)
    if (ispresent(sig)) {
      loadercommands[cmd] = sig
    }
  }
  for (const cmd of firmwarelistcommands(DRIVER_TYPE.RUNTIME)) {
    const sig = firmwaregetcommandargs(DRIVER_TYPE.RUNTIME, cmd)
    if (ispresent(sig)) {
      runtimecommands[cmd] = sig
    }
  }
  const zsswords: GADGET_ZSS_WORDS = {
    langcommands,
    clicommands,
    loadercommands,
    runtimecommands,
    flags: [
      ...objectKeys(memoryreadflags(message.player)),
      'inputmove',
      'inputalt',
      'inputctrl',
      'inputshift',
      'inputok',
      'inputcancel',
      'inputmenu',
      'didfail',
    ],
    statsboard: STATS_BOARD,
    statshelper: STATS_HELPER,
    statssender: STATS_SENDER,
    statsinteraction: STATS_INTERACTION,
    statsboolean: STATS_BOOLEAN,
    statsconfig: STATS_CONFIG,
    objects: memorylistallcodepagewithtype(CODE_PAGE_TYPE.OBJECT).map(
      (codepage) => memoryreadcodepagename(codepage),
    ),
    terrains: memorylistallcodepagewithtype(CODE_PAGE_TYPE.TERRAIN).map(
      (codepage) => memoryreadcodepagename(codepage),
    ),
    boards: memorylistallcodepagewithtype(CODE_PAGE_TYPE.BOARD).map(
      (codepage) => memoryreadcodepagename(codepage),
    ),
    palettes: memorylistallcodepagewithtype(CODE_PAGE_TYPE.PALETTE).map(
      (codepage) => memoryreadcodepagename(codepage),
    ),
    charsets: memorylistallcodepagewithtype(CODE_PAGE_TYPE.CHARSET).map(
      (codepage) => memoryreadcodepagename(codepage),
    ),
    loaders: memorylistallcodepagewithtype(CODE_PAGE_TYPE.LOADER).map(
      (codepage) => memoryreadcodepagename(codepage),
    ),
    categories: [...objectKeys(CATEGORY_CONSTS)],
    colors: [...objectKeys(colorconsts)],
    dirs: [
      ...objectKeys(DIR_CONSTS).filter(
        (item) => dirmods.includes(item) === false,
      ),
    ],
    dirmods: [...dirmods, ...objectKeys(collisionconsts)],
    exprs: [
      'aligned',
      'alligned',
      'contact',
      'blocked',
      'any',
      'countof',
      'color',
      'detect',
      'rnd',
      'abs',
      'intceil',
      'intfloor',
      'intround',
      'clamp',
      'min',
      'max',
      'pick',
      'pickwith',
      'random',
      'randomwith',
      'run',
      'runwith',
    ],
  }
  vm.replynext(message, 'ackzsswords', zsswords)
}
