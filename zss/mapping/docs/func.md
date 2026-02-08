# func.ts

**Purpose**: Async error handling — doasync runs a promise and reports errors via apierror. Used when firing-and-forgetting async operations in device context.

## Dependencies

- `zss/device/api` — DEVICELIKE, apierror

## Exports

| Export | Description |
|--------|-------------|
| `doasync(device, player, asyncfunc)` | Runs asyncfunc; on reject, logs and calls apierror(device, player, 'crash', message) |
