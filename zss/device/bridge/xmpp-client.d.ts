declare module '@xmpp/client' {
  export type XmppEntity = {
    on(event: string, listener: (...args: unknown[]) => void): void
    start(): Promise<void>
    stop(): Promise<void>
    send(stanza: unknown): Promise<void>
  }

  export function client(options?: Record<string, unknown>): XmppEntity

  export function xml(
    name: string,
    attrs?: Record<string, string>,
    ...children: unknown[]
  ): unknown
}
