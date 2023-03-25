import React, { useMemo, createRef } from 'react'

export const reactChildren = (element: JSX.Element) => {
  const elementChildren =
    element && element.type === React.Fragment
      ? React.Children.toArray(element.props.children)
      : React.Children.toArray(element)

  return elementChildren.filter((child) => React.isValidElement(child))
}

export const applyProps = (
  children: JSX.Element,
  props: (Partial<any> & React.Attributes) | undefined,
) =>
  React.Children.map(children, (element, index) =>
    React.cloneElement(element, { ...props, index }),
  )

export const applyPropsFunc = (
  children: JSX.Element,
  propsFunc: (index: number) => (Partial<any> & React.Attributes) | undefined,
) =>
  React.Children.map(children, (element, index) =>
    React.cloneElement(element, propsFunc(index)),
  )

export const childrenWithProps = (
  element: JSX.Element,
  props: (Partial<any> & React.Attributes) | undefined,
) => {
  return applyProps(element, props)
}

export const useChildrenRefs = <T>(source: JSX.Element[]) => {
  return useMemo(
    () => Array.from({ length: source.length }, () => createRef<T>()),
    [source.length],
  )
}
