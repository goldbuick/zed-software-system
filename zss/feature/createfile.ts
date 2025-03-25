export function createjsonblob(data: any): Blob {
  const str = JSON.stringify(data, null, 2)
  const bytes = new TextEncoder().encode(str)
  return new Blob([bytes], {
    type: 'application/json;charset=utf-8',
  })
}
