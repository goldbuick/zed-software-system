import { objectKeys } from 'ts-extras'

import { romcontent } from './contentmap'

const rommdfiles = import.meta.glob('./**/*.md', {
  eager: true,
  query: 'raw',
})
objectKeys(rommdfiles).forEach((name) => {
  const path = name.replace('.md', '').replace('./', '').replaceAll('/', ':')
  // @ts-expect-error yes
  romcontent[path] = rommdfiles[name].default
})
