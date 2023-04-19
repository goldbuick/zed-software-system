/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'

type AnyType = Y.Map<any> | Y.Array<any> | Y.Text | undefined

type ObservableCallback = ({
  events,
  transaction,
}: {
  events?: Y.YEvent<any>
  transaction?: Y.Transaction
}) => void

export function useObservable<T extends AnyType>(
  ytype: T,
  callback: ObservableCallback,
): T {
  const callbackRef = useRef<ObservableCallback>()

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    function handler(
      arg0: Y.YEvent<any> | undefined,
      arg1: Y.Transaction | undefined,
    ) {
      callbackRef.current?.({ events: arg0, transaction: arg1 })
    }

    // trigger on initial state
    handler(undefined, undefined)

    // notify on change
    ytype?.observe(handler)

    return () => {
      ytype?.unobserve(handler)
    }
  }, [ytype])

  return ytype
}

export function useRenderOnChange<T extends AnyType>(ytype: T): T {
  const [, setDidChange] = useState(0)

  useObservable(ytype, function () {
    setDidChange((state) => 1 - state)
  })

  return ytype
}

type ObservableDeepCallback = ({
  events,
  transaction,
}: {
  events?: Array<Y.YEvent<any>>
  transaction?: Y.Transaction
}) => void

export function useObservableDeep<T extends AnyType>(
  ytype: T,
  callback: ObservableDeepCallback,
): T {
  const callbackRef = useRef<ObservableDeepCallback>()

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    function handler(
      arg0: Array<Y.YEvent<any>> | undefined,
      arg1: Y.Transaction | undefined,
    ) {
      callbackRef.current?.({ events: arg0, transaction: arg1 })
    }

    // trigger on initial state
    handler(undefined, undefined)

    // notify on change
    ytype?.observeDeep(handler)

    return () => {
      ytype?.unobserveDeep(handler)
    }
  }, [ytype])

  return ytype
}

export function useRenderOnChangeDeep<T extends AnyType>(ytype: T): T {
  const [, setDidChange] = useState(0)

  useObservableDeep(ytype, function () {
    setDidChange((state) => 1 - state)
  })

  return ytype
}
