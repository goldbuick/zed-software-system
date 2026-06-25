import type { WanixRoot } from 'zss/feature/wanix/wanixiframechildtypes'

const WANIX_DOM_STYLE_PATH = '#web/dom/style'

const WANIX_DOM_TOUR_CSS = `@keyframes zss-wanix-tour-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
body {
  background: linear-gradient(90deg, #ff6ec7, #ffc93c, #6bcbff, #b388ff);
  background-size: 240% 240%;
  animation: zss-wanix-tour-shift 2.5s ease infinite;
}
body::after {
  content: '✨ Zed + Wanix #web/dom';
  position: fixed;
  bottom: 12px;
  right: 12px;
  font: 700 20px ui-monospace, monospace;
  color: #fff;
  text-shadow: 0 0 10px #ff6ec7;
  padding: 10px 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}
`

/** Append a fun stylesheet via Wanix #web/dom/style (closes → mounts on iframe body). */
export async function mountwanixdomstyle(root: WanixRoot) {
  await root.writeFile(WANIX_DOM_STYLE_PATH, WANIX_DOM_TOUR_CSS)
}
