import { useEffect } from 'react'
import { useDeviceData } from 'zss/gadget/device'
import { mobiletextblur } from 'zss/gadget/mobiletext'
import { useShallow } from 'zustand/react/shallow'

/** Touch UI is portrait-only: cover the canvas and drop the soft keyboard in landscape. */
export function RotatePortrait() {
  const { showtouchcontrols, islandscape } = useDeviceData(
    useShallow((state) => ({
      showtouchcontrols: state.showtouchcontrols,
      islandscape: state.islandscape,
    })),
  )
  const show = showtouchcontrols && islandscape

  useEffect(() => {
    if (show) {
      mobiletextblur()
    }
  }, [show])

  if (!show) {
    return null
  }

  return (
    <div className="rotate-portrait" role="alert">
      <p>rotate your device to portrait</p>
    </div>
  )
}
