import { useMemo } from 'react'
import { SPRITE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'

export function useSpritePool(
  sprites: SPRITE[],
  limit: number,
): [SPRITE[], number] {
  // setup sprite pool
  const spritepool = useMemo(() => {
    return Array.from({ length: limit }, () => ({
      id: '',
      x: 0,
      y: 0,
      char: 0,
      color: 0,
      bg: 0,
      stat: 0,
    }))
  }, [limit])

  // build lookups
  const range = useMemo(() => {
    const spritesbyid: Record<string, SPRITE> = {}
    for (let i = 0; i < sprites.length; ++i) {
      spritesbyid[sprites[i].id] = sprites[i]
    }
    const activeids = new Set(spritepool.map((s) => s.id))

    // update sprite pool
    let cursor = 0
    let range = 0
    for (let i = 0; i < limit; ++i) {
      if (spritepool[i].id) {
        // validate id is still in use
        const activesprite = spritesbyid[spritepool[i].id]
        if (ispresent(activesprite)) {
          // update sprite
          spritepool[i] = {
            ...activesprite,
          }
          range = Math.max(i, range)
        } else {
          // clear sprite
          spritepool[i].id = ''
        }
      } else if (cursor < sprites.length) {
        // scan for sprites that need slotted
        while (activeids.has(sprites[cursor]?.id) === true) {
          ++cursor
        }
        // slot sprite
        if (cursor < sprites.length) {
          spritepool[i] = {
            ...sprites[cursor++],
          }
          range = Math.max(i, range)
        }
      }
    }

    return range
  }, [sprites, limit, spritepool])

  return [spritepool, range]
}
