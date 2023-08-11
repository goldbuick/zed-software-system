export function enumKeys<T>(values: T) {
  return Object.keys(values).filter((item) => Number.isNaN(parseFloat(item)))
}
