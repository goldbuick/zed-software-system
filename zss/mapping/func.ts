export function doasync(
  asyncfunc: () => Promise<void>,
  errorfunc: (error: Error) => void = console.error,
) {
  asyncfunc().catch(errorfunc)
}
