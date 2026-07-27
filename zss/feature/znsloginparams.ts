import { clearqueryparams } from 'zss/feature/clearqueryparams'

/** Leaf: ZNS login query params — no url/firmware/deeplink imports (init-cycle safe). */

export const ZNS_LOGIN_CODE_PARAM = 'zns-code'
export const ZNS_LOGIN_EMAIL_PARAM = 'zns-email'
export const ZNS_LOGIN_NAMESPACE_PARAM = 'zns-namespace'

const ZNS_LOGIN_CODE_RE = /^[1-9]{6}$/
const ZNS_LOGIN_NAMESPACE_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

export type ZNS_LOGIN_URL_PARAMS = {
  code: string
  email?: string
  namespace?: string
}

function normalizenamespace(namespace: string) {
  return (namespace ?? '').toString().trim().toLowerCase()
}

/** Tenant hostname label check (same rules as login namespace query param). */
export function isvalidznsnamespacelabel(namespace: string): boolean {
  return ZNS_LOGIN_NAMESPACE_RE.test(namespace)
}

function readznsloginsearchparams(): URLSearchParams | undefined {
  try {
    return new URLSearchParams(location.search)
  } catch {
    return undefined
  }
}

export function readznsloginparamsfromurl(): ZNS_LOGIN_URL_PARAMS | undefined {
  const search = readznsloginsearchparams()
  if (!search) {
    return undefined
  }
  const code = search.get(ZNS_LOGIN_CODE_PARAM)?.trim()
  if (!code || !ZNS_LOGIN_CODE_RE.test(code)) {
    return undefined
  }
  const emailraw = search.get(ZNS_LOGIN_EMAIL_PARAM)?.trim().toLowerCase()
  const namespaceraw = normalizenamespace(
    search.get(ZNS_LOGIN_NAMESPACE_PARAM) ?? '',
  )
  const params: ZNS_LOGIN_URL_PARAMS = { code }
  if (emailraw?.includes('@')) {
    params.email = emailraw
  }
  if (namespaceraw && isvalidznsnamespacelabel(namespaceraw)) {
    params.namespace = namespaceraw
  }
  return params
}

export function readznslogincodefromurl(): string | undefined {
  return readznsloginparamsfromurl()?.code
}

export function clearznsloginparamsfromurl(): void {
  clearqueryparams([
    ZNS_LOGIN_CODE_PARAM,
    ZNS_LOGIN_EMAIL_PARAM,
    ZNS_LOGIN_NAMESPACE_PARAM,
  ])
}

export function clearznslogincodefromurl(): void {
  clearznsloginparamsfromurl()
}
