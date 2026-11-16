import { FolderMetaDefinition, defineMeta } from 'blume'

export default defineMeta({
  title: 'Play',
  icon: 'music',
  display: 'flat',
  pages: ['voices', 'effects', 'playnotation', 'scales'],
} as FolderMetaDefinition)
