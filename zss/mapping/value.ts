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

/** Coerce only pure digit tokens; keep hex ids and mixed alnum as strings. */
export function coercenumberorstringtoken(value: string): number | string {
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10)
  }
  return value
}
