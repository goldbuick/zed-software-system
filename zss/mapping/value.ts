export function maptostring(value: any) {
  return `${value ?? ''}`
}

export function maptonumber(arg: any, defaultvalue: number) {
  const value = parseFloat(maptostring(arg))
  return isNaN(value) ? defaultvalue : value
}

export function maptovalue<T>(arg: any, defaultvalue: T): T {
  if (typeof arg === typeof defaultvalue) {
    return arg
  }
  return defaultvalue
}
