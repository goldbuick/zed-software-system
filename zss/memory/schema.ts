enum SCHEMA_TYPE {
  ANY,
  SKIP,
  STRING,
  NUMBER,
  ARRAY,
  OBJECT,
}

type SCHEMA_ITEM =
  | {
      type: SCHEMA_TYPE.ANY
    }
  | {
      type: SCHEMA_TYPE.SKIP
    }
  | {
      type: SCHEMA_TYPE.STRING
    }
  | {
      type: SCHEMA_TYPE.NUMBER
    }
  | {
      type: SCHEMA_TYPE.ARRAY
      element: SCHEMA_ITEM
    }
  | {
      type: SCHEMA_TYPE.OBJECT
      element?: SCHEMA_ITEM
      props?: Record<string, SCHEMA_ITEM>
    }

const ANY_SCHEMA: SCHEMA_ITEM = { type: SCHEMA_TYPE.ANY }
const SKIP_SCHEMA: SCHEMA_ITEM = { type: SCHEMA_TYPE.SKIP }
const STRING_SCHEMA: SCHEMA_ITEM = { type: SCHEMA_TYPE.STRING }
const NUMBER_SCHEMA: SCHEMA_ITEM = { type: SCHEMA_TYPE.NUMBER }

export const BOARD_ELEMENT_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  element: ANY_SCHEMA,
  props: {
    kind: SKIP_SCHEMA,
    name: SKIP_SCHEMA,
    code: SKIP_SCHEMA,
    sender: SKIP_SCHEMA,
    data: SKIP_SCHEMA,
    //
    id: STRING_SCHEMA,
    cycle: NUMBER_SCHEMA,
    x: NUMBER_SCHEMA,
    y: NUMBER_SCHEMA,
    lx: NUMBER_SCHEMA,
    ly: NUMBER_SCHEMA,
    char: NUMBER_SCHEMA,
    color: NUMBER_SCHEMA,
    bg: NUMBER_SCHEMA,
    pushable: NUMBER_SCHEMA,
    collision: NUMBER_SCHEMA,
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
    id: STRING_SCHEMA,
    terrain: {
      type: SCHEMA_TYPE.ARRAY,
      element: BOARD_ELEMENT_SCHEMA,
    },
    objects: {
      type: SCHEMA_TYPE.OBJECT,
      element: BOARD_ELEMENT_SCHEMA,
    },
    stats: {
      type: SCHEMA_TYPE.OBJECT,
      element: ANY_SCHEMA,
      props: {
        isdark: NUMBER_SCHEMA,
        over: STRING_SCHEMA,
        under: STRING_SCHEMA,
        exitnorth: STRING_SCHEMA,
        exitsouth: STRING_SCHEMA,
        exitwest: STRING_SCHEMA,
        exiteast: STRING_SCHEMA,
        timelimit: NUMBER_SCHEMA,
        maxplayershots: NUMBER_SCHEMA,
      },
    },
  },
}

export const BITMAP_SCHEMA: SCHEMA_ITEM = {
  type: SCHEMA_TYPE.OBJECT,
  props: {
    width: SKIP_SCHEMA,
    height: SKIP_SCHEMA,
    size: SKIP_SCHEMA,
    //
    id: STRING_SCHEMA,
    bits: {
      type: SCHEMA_TYPE.ARRAY,
      element: NUMBER_SCHEMA,
    },
  },
}
