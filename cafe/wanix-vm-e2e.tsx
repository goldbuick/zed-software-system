const embed =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('embed') === '1'

import { installewanixe2ebridge } from 'zss/testsupport/wanixe2ebridge'
import { installwanixvmembedchild } from 'zss/testsupport/wanixvmembedchild'

if (embed) {
  installwanixvmembedchild()
} else {
  installewanixe2ebridge()
}
