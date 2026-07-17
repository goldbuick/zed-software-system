import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { UserFocus } from 'zss/gadget/userinput'
import { useScreenSize } from 'zss/gadget/userscreen'
import { TapeLayoutTiles } from 'zss/screens/tape/layouttiles'
import { WanixTermScreen } from 'zss/screens/wanix/termscreen'
import { WanixTermSizeSync } from 'zss/screens/wanix/termsizesync'

/**
 * Independent guest attach overlay. Uses attachlayout (not useTape.layout)
 * and is mutually exclusive with the tape CLI chrome.
 */
export function WanixAttachPanel() {
  const screensize = useScreenSize()
  const attachpanelopen = useWanixClient((state) => state.attachpanelopen)
  const attachlayout = useWanixClient((state) => state.attachlayout)
  const attachedsessionkey = useWanixClient((state) => state.attachedsessionkey)
  const terminalmode = useTape((state) => state.terminalmode)
  const editoropen = useTape((state) => state.editor.open)

  if (!attachpanelopen || attachedsessionkey == null || editoropen) {
    return <WanixTermSizeSync />
  }

  if (screensize.cols < 10 || screensize.rows < 10) {
    return <WanixTermSizeSync />
  }

  let top = 0
  let height = screensize.rows
  switch (attachlayout) {
    case TAPE_DISPLAY.TOP:
      height = Math.floor(screensize.rows * 0.5)
      break
    case TAPE_DISPLAY.BOTTOM:
      height = Math.ceil(screensize.rows * 0.5)
      top = screensize.rows - height
      break
    default:
    case TAPE_DISPLAY.FULL:
      break
  }

  return (
    <>
      <WanixTermSizeSync height={height} width={screensize.cols} />
      <group
        position={[
          Math.round(screensize.marginx),
          Math.round(screensize.marginy * 0.25),
          0,
        ]}
      >
        <ShadeBoxDither
          width={screensize.cols}
          height={screensize.rows}
          top={top}
          left={0}
          right={screensize.cols - 1}
          bottom={top + height - 1}
          alpha={0.333}
        />
        <UserFocus blockhotkeys>
          <TapeLayoutTiles
            label="wanixattach"
            terminalmode={terminalmode}
            top={top}
            left={0}
            width={screensize.cols}
            height={height}
          >
            <WanixTermScreen />
          </TapeLayoutTiles>
        </UserFocus>
      </group>
    </>
  )
}
