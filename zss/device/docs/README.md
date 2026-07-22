# Device documentation

Devices are the message-oriented edges of ZSS: register (UI), vm (sim), boardrunner, bridge, synth, modem, clock, forward, and lazy TTS/STT workers.

## Module index

| Doc | Purpose |
|-----|---------|
| [devices-and-messaging.md](devices-and-messaging.md) | Device table, worker construction, hub/forward realms |
| [message-flow.md](message-flow.md) | Who emits what to whom (`device:action` targets) |
| [feedback-channels-audit.md](feedback-channels-audit.md) | Feedback / ack channel inventory |

## Related

- Spine: [System map](https://zed.cafe/docs/map/) · [Architecture](https://zed.cafe/docs/architecture/)
- Join mode VM: [`joinvm.ts`](../joinvm.ts) (via `createplatform(true)` in [`platform.ts`](../../platform.ts))
- Firmware commands: [commands.md](../../firmware/docs/commands.md)
