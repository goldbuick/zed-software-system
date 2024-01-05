// import * as Y from 'yjs'

// going to dump this in favor of assembler firmware

// import { CODE_PAGE_TYPE } from '../codepage'
// import { createFirmware } from '../firmware'

// const DOCS = new Y.Doc()

// function getCodePages() {
//   return DOCS.getMap<Y.Map<any>>()
// }

// function mapToType<T>(map: Y.Map<any>, key: string) {
//   return map.get(key) as T
// }

// function mapToEntryLite(map: Y.Map<any>) {
//   return {
//     id: mapToType<string>(map, 'id'),
//     type: mapToType<CODE_PAGE_TYPE>(map, 'type'),
//     name: mapToType<Y.Text>(map, 'name').toString(),
//   }
// }

// export const DOCS_FIRMWARE = createFirmware(
//   (chip, name) => {
//     switch (name) {
//       case 'codepages': {
//         const codepages: any[] = []
//         for (const value of getCodePages().values()) {
//           codepages.push({
//             id: mapToType<string>(value, 'id'),
//             name: mapToType<Y.Text>(value, 'name').toString(),
//             entries: mapToType<Y.Array<Y.Map<any>>>(value, 'entries').map(
//               mapToEntryLite,
//             ),
//           })
//         }
//         return [true, codepages]
//       }
//     }
//     return [false, undefined]
//   },
//   (chip, name, value) => {
//     switch (name) {
//       case 'codepages':
//         // todo raise error about read only
//         return [true, 0]
//     }
//     return [false, undefined]
//   },
// ).command('create', (chip, words) => {
//   console.info({ words })
//   return 0
// })
