import { NumKey } from './numkey'

type NumpadProps = {
  width: number
}

export function Numpad({ width }: NumpadProps) {
  const left = width - 19
  const mid = width - 13
  const right = width - 7
  return (
    <>
      <NumKey x={left} y={1} letters="" digit="1" />
      <NumKey x={mid} y={1} letters="ABC" digit="2" />
      <NumKey x={right} y={1} letters="DEF" digit="3" />
      <NumKey x={left} y={5} letters="GHI" digit="4" />
      <NumKey x={mid} y={5} letters="JKL" digit="5" />
      <NumKey x={right} y={5} letters="MNO" digit="6" />
      <NumKey x={left} y={9} letters="PQRS" digit="7" />
      <NumKey x={mid} y={9} letters="TUV" digit="8" />
      <NumKey x={right} y={9} letters="WXYZ" digit="9" />
      <NumKey x={left} y={13} letters="" digit="#" />
      <NumKey x={mid} y={13} letters="" digit="0" />
      <NumKey x={right} y={13} letters="ENTER" digit="[Enter]" />
    </>
  )
}
