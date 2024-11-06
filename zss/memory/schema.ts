import { BOARD_SIZE } from './types'

export enum SCHEMA_TYPE {
  ANY,
  SKIP,
  WORD_TYPE,
  ARRAY,
  OBJECT,
  READ_ONLY,
}

type SCHEMA_ITEM =
  | {
      type: SCHEMA_TYPE.ANY
    }
  | {
      type: SCHEMA_TYPE.SKIP
    }
  | {
      type: SCHEMA_TYPE.WORD_TYPE
      kind: 'string' | 'number' | 'collision' | 'color'
    }
  | {
      type: SCHEMA_TYPE.ARRAY
      element: SCHEMA_ITEM
      fixed?: number
    }
  | {
      type: SCHEMA_TYPE.OBJECT
      numkey?: boolean
      element?: SCHEMA_ITEM
      props?: Record<string, SCHEMA_ITEM>
    }
  | {
      type: SCHEMA_TYPE.READ_ONLY
    }

const ANY_SCHEMA: SCHEMA_ITEM = { type: SCHEMA_TYPE.ANY }
const SKIP_SCHEMA: SCHEMA_ITEM = { type: SCHEMA_TYPE.SKIP }
const STRING_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.WORD_TYPE,
  kind: 'string',
}
const NUMBER_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.WORD_TYPE,
  kind: 'number',
}
const COLLISION_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.WORD_TYPE,
  kind: 'collision',
}
const COLOR_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.WORD_TYPE,
  kind: 'color',
}

const READ_ONLY_SCHEMA: SCHEMA_ITEM = { type: SCHEMA_TYPE.READ_ONLY }

export const BOARD_ELEMENT_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  element: ANY_SCHEMA,
  props: {
    kind: READ_ONLY_SCHEMA,
    name: READ_ONLY_SCHEMA,
    code: SKIP_SCHEMA,
    sender: SKIP_SCHEMA,
    data: SKIP_SCHEMA,
    id: READ_ONLY_SCHEMA,
    cycle: NUMBER_SCHEMA,
    x: NUMBER_SCHEMA,
    y: NUMBER_SCHEMA,
    lx: NUMBER_SCHEMA,
    ly: NUMBER_SCHEMA,
    char: NUMBER_SCHEMA,
    color: COLOR_SCHEMA,
    bg: COLOR_SCHEMA,
    pushable: NUMBER_SCHEMA,
    collision: COLLISION_SCHEMA,
    destructible: NUMBER_SCHEMA,
    p1: ANY_SCHEMA,
    p2: ANY_SCHEMA,
    p3: ANY_SCHEMA,
    stepx: ANY_SCHEMA,
    stepy: ANY_SCHEMA,
  },
}

export const BOARD_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  props: {
    id: SKIP_SCHEMA,
    terrain: {
      type: SCHEMA_TYPE.ARRAY,
      element: BOARD_ELEMENT_SCHEMA,
      fixed: BOARD_SIZE,
    },
    objects: {
      type: SCHEMA_TYPE.OBJECT,
      element: BOARD_ELEMENT_SCHEMA,
    },
    isdark: NUMBER_SCHEMA,
    over: STRING_SCHEMA,
    under: STRING_SCHEMA,
    exitnorth: STRING_SCHEMA,
    exitsouth: STRING_SCHEMA,
    exitwest: STRING_SCHEMA,
    exiteast: STRING_SCHEMA,
    timelimit: NUMBER_SCHEMA,
    restartonzap: NUMBER_SCHEMA,
    maxplayershots: NUMBER_SCHEMA,
  },
}

export const BITMAP_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  props: {
    width: READ_ONLY_SCHEMA,
    height: READ_ONLY_SCHEMA,
    size: SKIP_SCHEMA,
    bits: {
      type: SCHEMA_TYPE.ARRAY,
      element: NUMBER_SCHEMA,
      fixed: -1,
    },
  },
}

export const EIGHT_FX_CONFIG_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  props: {
    fx: NUMBER_SCHEMA,
    settings: {
      type: SCHEMA_TYPE.OBJECT,
      numkey: true,
      element: STRING_SCHEMA,
    },
  },
}

export const EIGHT_SYNTH_CONFIG_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  props: {
    synth: NUMBER_SCHEMA,
    effects: {
      type: SCHEMA_TYPE.ARRAY,
      element: EIGHT_FX_CONFIG_SCHEMA,
    },
    settings: {
      type: SCHEMA_TYPE.OBJECT,
      numkey: true,
      element: STRING_SCHEMA,
    },
  },
}

export const EIGHT_TRACK_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  props: {
    tempo: NUMBER_SCHEMA,
    synths: {
      type: SCHEMA_TYPE.ARRAY,
      element: EIGHT_SYNTH_CONFIG_SCHEMA,
      fixed: 8,
    },
    measures: {
      type: SCHEMA_TYPE.ARRAY,
      element: {
        type: SCHEMA_TYPE.ARRAY,
        element: NUMBER_SCHEMA,
        fixed: 8,
      },
    },
  },
}
