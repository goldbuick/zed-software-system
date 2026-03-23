declare module 'irc-framework' {
  export class Client {
    constructor(options?: unknown)
    static setDefaultTransport(transport: unknown): void
    connect(options: Record<string, unknown>): void
    quit(message?: string): void
    join(channel: string, key?: string): void
    on(event: string, listener: (...args: any[]) => void): void
  }
}
