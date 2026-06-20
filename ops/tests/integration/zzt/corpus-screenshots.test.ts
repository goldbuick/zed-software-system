/**
 * Corpus screenshot batch runner (jest for zss/memory module resolution).
 * yarn task run content:zzt:corpus:screenshots [limit N] [force]
 */
import {
  parsescreenshotoptions,
  renderscreenshots,
} from '../../../../tasks/implementations/content/museum-zzt-corpus-screenshots'

const TASK_ARGV = process.env.ZSS_TASK_ARGS?.split(' ').filter(Boolean) ?? []

it(
  'renders zzt corpus board screenshots',
  () => {
    const opts = parsescreenshotoptions(TASK_ARGV)
    const code = renderscreenshots(opts)
    expect(code).toBe(0)
  },
  259_200_000,
)
