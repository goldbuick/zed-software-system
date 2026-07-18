# Empty peer root for zedsync seed scenarios

Serve this directory with the local 9P fixture so `#wanix zedsync remote` seeds
from `zedcafe/` into an empty peer (no pre-existing book tree).

```bash
yarn task run ops:fixtures:wanix:p9server:dev -- ops/fixtures/wanix/scenarios/zedsync-peer
```

Keep this folder empty aside from this README (dotfiles are ignored by zedsync).
After a successful seed, the peer will contain allowlisted export JSON copied
from the cafe host export. Delete-restore checks remove a peer file and wait for
zedsync to restore it from `zedcafe/`.

For a pre-populated peer (sync without empty seed), use the default
`ops/fixtures/wanix/p9server/serve-root/` instead.
