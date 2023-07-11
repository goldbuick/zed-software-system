import { PACKAGE } from './format'

// we load packages into the workspace
export type WORKSPACE = {
  // primary package being run
  // deep-cave@1
  main: string
  // this is index by name + version
  // daves-rpg@1 -> PACKAGE
  packages: Record<string, PACKAGE>
}
