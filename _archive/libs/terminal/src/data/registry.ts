import { PACKAGE } from './format'

export type REGISTRY = Record<string, PACKAGE>

export function createRegistry(): REGISTRY {
  return {}
}

export function loadLocalPackage(registry: REGISTRY, pkg: PACKAGE) {
  const fullName = `${pkg.name}@${pkg.version}`
  registry[fullName] = pkg
}

export async function loadPackage(
  registry: REGISTRY,
  name: string,
  version: number,
): Promise<PACKAGE | undefined> {
  const fullName = `${name}@${version}`
  // todo this interacts with the user service
  // and will create a temp user to download all the packages
  return registry[fullName]
}
