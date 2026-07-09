# encode.ts

**Purpose**: Base64 and base64url encoding helpers. Worker-safe (`btoa`, `TextEncoder` only).

## Exports

| Export | Description |
|--------|-------------|
| `arraybuffertobase64(buffer)` | Chunked `ArrayBuffer` → standard base64 |
| `utf8tobase64url(text)` | UTF-8 string → base64url (no padding) |
| `base64urltobase64(base64url)` | Restore padding and standard alphabet |
| `base64tobase64url(base64)` | Standard base64 → base64url (no padding) |
