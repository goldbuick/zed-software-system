import { def, handler, tasksonly } from '../../../helpers'
import type { TaskDef } from '../../../types'
import {
  rundaisyregenadsrenvcurvetonefixture,
  rundaisyregendaisydrumparityfixtures,
  rundaisyregenenvadsrparityfixtures,
  rundaisyregensosvoicefixtures,
  rundaisyregensynthparityfixtures,
} from '../daisy'

export const OPS_FIXTURES_SYNTH_TASKS: TaskDef[] = [
  tasksonly(
    'ops:fixtures:synth:regen:all',
    'Regenerate all synth parity fixtures under ops/fixtures/synth/',
    [
      'ops:daisy:build',
      'ops:fixtures:synth:regen:tone',
      'ops:fixtures:synth:regen:drums',
      'ops:fixtures:synth:regen:adsrenvcurve:tone',
      'ops:fixtures:synth:regen:env-adsr:tone',
      'ops:fixtures:synth:regen:sos-voice',
    ],
    { tags: ['slow'] },
  ),
  def('ops:fixtures:synth:regen:drums', {
    description: 'Regenerate daisy drum parity fixtures',
    run: handler(rundaisyregendaisydrumparityfixtures),
  }),
  def('ops:fixtures:synth:regen:tone', {
    description: 'Regenerate synth parity fixtures (tone backend)',
    run: handler((ctx) =>
      rundaisyregensynthparityfixtures({
        ...ctx,
        args: ['--tone', ...ctx.args],
      }),
    ),
  }),
  def('ops:fixtures:synth:regen:adsrenvcurve:tone', {
    description: 'Regenerate adsrenvcurve tone metrics fixture',
    run: handler(rundaisyregenadsrenvcurvetonefixture),
  }),
  def('ops:fixtures:synth:regen:env-adsr:tone', {
    description: 'Regenerate env ADSR tone parity metrics fixture',
    run: handler(rundaisyregenenvadsrparityfixtures),
  }),
  def('ops:fixtures:synth:regen:sos-voice', {
    description: 'Regenerate SOS voice parity fixtures',
    run: handler(rundaisyregensosvoicefixtures),
  }),
]
