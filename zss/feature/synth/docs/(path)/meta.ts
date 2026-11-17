import { FolderMetaDefinition, defineMeta } from 'blume'

export default defineMeta({
  title: 'Internals',
  icon: 'cpu',
  display: 'flat',
  pages: [
    // Signal path
    'implementation-matrix',
    'audiochain',
    'parallel-fx-bus',
    'gain-levels',
    'drums',
    'record-and-mp3',
    // Module maps
    'factory',
    'source',
    'sourcefxsetup',
    'fx-and-fxchannels',
    'tickhandler',
    'algosynth',
    'worklets',
  ],
} as FolderMetaDefinition)
