export const ismac = navigator.userAgent.includes('Mac')
export const islinux = navigator.userAgent.includes('Linux')
export const isfirefox =
  navigator.userAgent.includes('Firefox') ||
  navigator.userAgent.includes('FxiOS')
export const metakey = ismac ? 'cmd' : 'ctrl'
