import { ElementProps } from '../types'

export function TextEdit({ element }: ElementProps) {
  // console.info(element)
  return null
}

// import { Html } from '@react-three/drei'
// import React, { useState } from 'react'
// import { useDebounce } from 'use-debounce'

// import Fiddle from '/cc/ui/anim/Fiddle'
// import { HTML_RATIO } from '/cc/ui/EmbedHtml'

// type Props = {
//   width: number
//   height?: number
//   position?: [x: number, y: number, z: number]
//   onSubmit?: () => void
// } & JSX.IntrinsicElements['input']

// type InnerInputProps = {
//   width: number
//   height: number
// } & JSX.IntrinsicElements['input']

// function InnerInput({ width, height, ...props }: InnerInputProps) {
//   const [value, setValue] = useState(props.value)
//   const [external] = useDebounce(props.value, 100)

//   // a change in the external value has happend
//   // and the internal value doesn't match
//   if (external !== props.value && value !== props.value) {
//     setValue(props.value)
//   }

//   return (
//     <input
//       {...props}
//       style={{
//         ...props.style,
//         width,
//         height,
//         padding: 2,
//         fontSize: 30,
//         borderRadius: 0,
//         fontFamily: 'IBM_VGA',
//       }}
//       value={value}
//       onChange={(event) => {
//         event.stopPropagation()
//         props.onChange?.(event)
//         setValue(event.target.value)
//       }}
//     />
//   )
// }

// function Input({ width, height = 10, position, onSubmit, ...props }: Props) {
//   return (
//     <Fiddle>
//       <Html center occlude eps={0} position={position}>
//         <form
//           onSubmit={(e) => {
//             e.preventDefault()
//             e.stopPropagation()
//             onSubmit?.()
//           }}
//         >
//           <InnerInput
//             width={width * HTML_RATIO}
//             height={height * HTML_RATIO}
//             {...props}
//           />
//         </form>
//       </Html>
//     </Fiddle>
//   )
// }

// export default Input
