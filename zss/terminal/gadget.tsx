import { Layout } from 'zss/gadget/components/layout'
import { Tape } from 'zss/gadget/components/tape'
import { UserFocus } from 'zss/gadget/components/userinput'

export function Gadget() {
  return (
    <UserFocus>
      <Layout />
      <Tape />
    </UserFocus>
  )
}
