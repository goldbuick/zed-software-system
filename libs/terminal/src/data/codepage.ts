import { createGuid } from '@zss/system/mapping/guid'
/*

source for all code page related data

do we have read & write modalities?

or do we have separate edit types?

I vote for separate edit types
because that means MVP is play only
and the create funcs can be used in the edit types

*/

// collection of software bundles indexed by name
const container = {}

// collection of software codepages indexed by bundleName.name
const bundle = {}

// collection of software data indexed by content type

/*
what are the content types?

  zss code
  board
  terrain
  object
  charset ? collection of ?
  urls ? collection of ? media urls

  type info [char, color, bg, terrain/object, etc...] is this just extended naming?
  @name terrain 178 brown dark gray
  or
  @bobby
  @terrain
  @charset rpg.elf
  @char 32
  @color red
  @bg black
  @stat apples 5 32 'creates a custom state called apples that defaults to 5 with a range of 32

*/

type StateCommon = {
  id?: string
}

export type GameStats = {
  collision?: COLLISION
  pushable?: boolean
}

export type GameBlock = {
  tile?: number
  color?: number
}

export type GameTerrain = GameBlock & {
  ref?: string
  type?: string
  name?: string
} & GameStats

export type BoardDataDefault = {
  id?: string
  x: number
  y: number
  width: number
  height: number
  start?: boolean
  overlay?: boolean
  terrain: GameTerrain[]
  objects: GameObjectSet
}

export type BoardDataState = BoardDataDefault & StateCommon

export type CharData = boolean[]

export type CodePageDefault = {
  id?: string
  zzs: string
  board?: BoardDataState
  notes?: Record<string, string>
  charset?: Record<number, CharData>
}

export type CodePageState = CodePageDefault & StateCommon

export type BundleDefault = {
  id?: string
  name: string
  codepages: CodePageDefault[]
}

export type BundleState = BundleDefault & StateCommon

export function createBundle(create: BundleDefault): BundleState {
  const id = create.id || createGuid()
  return { ...create, id }
}

export function createContainer() {
  return {} as Record<string, BundleState>
}
