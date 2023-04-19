/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'

type AnyType = Y.Map<any> | Y.Array<any> | Y.Text | undefined

type ObservableCallback = {
  events?: Y.YEvent<any>
  transaction?: Y.Transaction
}

export function useObservable<T extends AnyType>(
  ytype: T,
  callback: ({ events, transaction }: ObservableCallback) => void,
): T {
  const handler = useCallback(
    function (
      arg0: Y.YEvent<any> | undefined,
      arg1: Y.Transaction | undefined,
    ) {
      callback({ events: arg0, transaction: arg1 })
    },
    [callback],
  )

  useEffect(() => {
    // trigger on initial state
    handler(undefined, undefined)

    // notify on change
    ytype?.observe(handler)

    return () => {
      ytype?.unobserve(handler)
    }
  }, [ytype, handler])

  return ytype
}

export function useRenderOnChange<T extends AnyType>(ytype: T): T {
  const [, setDidChange] = useState(0)

  useObservable(ytype, function () {
    setDidChange((state) => 1 - state)
  })

  return ytype
}

type ObservableDeepCallback = {
  events?: Array<Y.YEvent<any>>
  transaction?: Y.Transaction
}

export function useObservableDeep<T extends AnyType>(
  ytype: T | undefined,
  callback: ({ events, transaction }: ObservableDeepCallback) => void,
): T | undefined {
  const handler = useCallback(
    function (
      arg0: Array<Y.YEvent<any>> | undefined,
      arg1: Y.Transaction | undefined,
    ) {
      callback({ events: arg0, transaction: arg1 })
    },
    [callback],
  )

  useEffect(() => {
    // trigger on initial state
    handler(undefined, undefined)

    // notify on change
    ytype?.observeDeep(handler)

    return () => {
      ytype?.unobserveDeep(handler)
    }
  }, [ytype, handler])

  return ytype
}

export function useRenderOnChangeDeep<T extends AnyType>(ytype: T): T {
  const [, setDidChange] = useState(0)

  useObservableDeep(ytype, function () {
    setDidChange((state) => 1 - state)
  })

  return ytype
}
