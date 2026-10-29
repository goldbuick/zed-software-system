import { FolderMetaDefinition, defineMeta } from 'blume'

export default defineMeta({
  title: 'Engine',
  icon: 'cpu',
  display: 'flat',
  pages: [
    'factory',
    'source',
    'sourcefxsetup',
    'tickhandler',
    'fx-and-fxchannels',
    'algosynth',
    'worklets',
  ],
} as FolderMetaDefinition)
