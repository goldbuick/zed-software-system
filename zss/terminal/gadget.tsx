import { Layout } from 'zss/gadget/layout'
import { Tape } from 'zss/gadget/tape'
import { UserFocus } from 'zss/gadget/userinput'

export function Gadget() {
  return (
    <UserFocus>
      <Layout />
      <Tape />
    </UserFocus>
  )
}
