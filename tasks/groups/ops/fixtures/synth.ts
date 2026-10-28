import { def, handler, tasksonly } from '../../../helpers'
import type { TaskDef } from '../../../types'
import {
  rundaisyregendaisydrumparityfixtures,
  rundaisyregensosvoicefixtures,
} from '../daisy'

export const OPS_FIXTURES_SYNTH_TASKS: TaskDef[] = [
  tasksonly(
    'ops:fixtures:synth:regen:all',
    'Regenerate Daisy synth parity fixtures under ops/fixtures/synth/',
    [
      'ops:daisy:build',
      'ops:fixtures:synth:regen:drums',
      'ops:fixtures:synth:regen:sos-voice',
    ],
    { tags: ['slow'] },
  ),
  def('ops:fixtures:synth:regen:drums', {
    description: 'Regenerate daisy drum parity fixtures',
    run: handler(rundaisyregendaisydrumparityfixtures),
  }),
  def('ops:fixtures:synth:regen:sos-voice', {
    description: 'Regenerate SOS voice parity fixtures',
    run: handler(rundaisyregensosvoicefixtures),
  }),
]
