import { compilescript } from 'zss/feature/lang/langcompileclient'

test('compile quoted send', () => {
  const build = compilescript(
    'seg',
    `@segment
:think
#send "oid_head" :acceptlink
#end
`,
  )
  const text = Function.prototype.toString.call(build.code!)
  // eslint-disable-next-line no-console
  console.log(text)
})
