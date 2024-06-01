import { useCallback, useEffect, useState } from 'react'

export function useBlink() {
  const [blink, setBlink] = useState(0)
  const callback = useCallback(() => setBlink((state) => 1 - state), [setBlink])

  useEffect(() => {
    const id = setInterval(callback, 300)
    return () => clearInterval(id)
  }, [callback])

  return !!blink
}
