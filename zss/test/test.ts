import test_zss from 'bundle-text:./blocks.txt'
import { loadDefaultCharset, loadDefaultPalette } from 'zss/gadget/file'
import { compile, createChip, createFirmware } from 'zss/lang'

export function langTest() {
  const pal = loadDefaultPalette()
  const chr = loadDefaultCharset()

  console.info({ pal, chr })

  return
  const values: Record<string, number> = {}

  // define commands
  const firmware = createFirmware()
    .command('print', (chip, args) => {
      console.info(...args)
      return 0
    })
    .command('set', (chip, args) => {
      const [name, value] = args
      if (chip.isString(name)) {
        values[name] = chip.evalToNumber(value)
      }
      return 0
    })
    .command('get', (chip, args) => {
      const [name] = args
      if (chip.isString(name)) {
        return values[name] ?? 0
      }
      return 0
    })
    .command('if', (chip, args) => {
      const [value] = args
      return value
    })
    .command('send', (chip, args) => {
      console.info('send', args)
      return 0
    })

  // compile script into runnable code
  const build = compile(test_zss)
  if (build.errors) {
    console.info(build.errors)
    console.info(build.tokens)
  }

  // create chip from compiled zss
  const chip = createChip(build)

  // install firmware on chip
  firmware.install(chip)

  // run chip one tick
  chip.tick()
}
