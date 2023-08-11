import { WORLD_BOARD } from './format'
import localMainPackage from './local/main'
import { REGISTRY, createRegistry, loadLocalPackage } from './registry'

type WORKSPACE_ITEM = {
  id: string
}

export type WORKSPACE_BOARD = WORKSPACE_ITEM & WORLD_BOARD

// we load packages into the workspace
export type WORKSPACE = {
  // registry to manage loading package content
  registry: REGISTRY
  // current set of boards
  boards: Record<string, WORKSPACE_BOARD>
  // primary package being run
  // deep-cave@1
  // main: string
}

/*

we load a given package 'name@number' into main in our workspace
we run the main codepage from the main package, and that's it

*/

export function createWorkspace(): WORKSPACE {
  return {
    registry: createRegistry(),
    boards: {},
  }
}

export async function loadWorkspace(
  workspace: WORKSPACE,
  packageName: string,
  packageVersion: number,
) {
  // bootstrap via local package content
  loadLocalPackage(workspace.registry, localMainPackage)

  console.info(workspace)

  return workspace
}
