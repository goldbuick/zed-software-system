/** Thin cafe entry for /wanix.html — iframe realm only. */
import { patchwanixbindwss } from 'zss/device/wanixserver/patchwanixbindwss'
import 'zss/device/wanixserver/runtime'
import 'zss/device/wanixserver'

// CDN wanix.min.js finishes before this module (script order in wanix.html).
patchwanixbindwss()
void customElements.whenDefined('wanix-bind').then(() => {
  patchwanixbindwss()
})
