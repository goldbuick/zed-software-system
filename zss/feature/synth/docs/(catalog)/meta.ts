import { FolderMetaDefinition, defineMeta } from 'blume'

export default defineMeta({
  title: 'Catalog',
  icon: 'library',
  display: 'flat',
  pages: [
    'voice-types-reference',
    'fx-types-reference',
    'voiceconfig',
    'voicefx',
  ],
} as FolderMetaDefinition)
