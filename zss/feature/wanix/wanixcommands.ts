import type { DEVICELIKE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  attachwanixtarget,
  connectwanixremote,
  disconnectwanixremote,
  ensurewanixsandbox,
  haltwanixtask,
  haltwanixvm,
  iswanixspaceactive,
  readwanixstatus,
  readwanixvmpreperror,
  readwanixvmprepstage,
  sendwanixtermwrite,
  spawnwanixvm,
  spawnwanixvmspace,
  startwanixbridge,
  stopwanixbridge,
} from 'zss/feature/wanix/wanixhost'
import {
  iframechildhaltzedcafe,
} from 'zss/feature/wanix/wanixtermiframehost'
import {
  type WANIX_ATTACH_KIND,
  haswanixcompute,
  haswanixtasks,
  haswanixvms,
  iswanixtermactive,
  iswanixtermraw,
  readwanixattached,
  readwanixattachedkind,
  readwanixremotes,
  readwanixtask,
  readwanixtasks,
  readwanixvm,
  readwanixvms,
  registervm,
  removetask,
  removevm,
} from 'zss/feature/wanix/wanixsession'
import { leavewanixattachedterminal } from 'zss/feature/wanix/wanixterminalmode'
import { wanixtermscreenwritepong } from 'zss/feature/wanix/wanixtermscreen'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
} from 'zss/feature/wanix/wanixvmassets'
import {
  encodezedcafeinboxjson,
  exportfilestoguestfiles,
  fetchzedcafeexportfiles,
  finalizewanixzedcafeaftervmboot,
  guestfilestoexportfiles,
  readzedcafeexportbookcount,
  stopzedcafepoll,
  wanixpullzedcafe,
} from 'zss/feature/wanix/wanixzedcafe'
import { WANIX_REMOTE_DEFAULT_DST } from 'zss/feature/wanix/wanixremoteconstants'
import {
  parsewanixbridgehosturl,
  readwanixbridgeimporturl,
} from 'zss/feature/wanix/wanixbridgehost'
import {
  readwanixzedcafeready,
  setwanixzedcafeready,
  setwanixzedcafetaskrid,
} from 'zss/feature/wanix/wanixzedcafesession'
import {
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

export async function wanixhandlevmstart(
  device: DEVICELIKE,
  player: string,
  vmid?: string,
) {
  try {
    if (iswanixspaceactive()) {
      const status = readwanixstatus()
      if (!status.vmbindsready && haswanixcompute()) {
        apilog(
          device,
          player,
          'wanix vm prep: rebooting wanix host for vm layout (stops tasks)',
        )
      }
    }
    apilog(device, player, 'wanix vm prep: ensuring zed-cafe export...')
    let exportfiles = await fetchzedcafeexportfiles(device, player)
    let guestfiles = exportfilestoguestfiles(exportfiles)
    const bookcount = readzedcafeexportbookcount(exportfiles)
    apilog(
      device,
      player,
      `wanix vm prep: export bookCount=${bookcount} files=${exportfiles.length}`,
    )
    if (bookcount === 0) {
      apilog(
        device,
        player,
        'wanix vm prep: warning — no books in export snapshot',
      )
    }
    if (iswanixspaceactive() && readwanixzedcafeready()) {
      const { iframecapturezedcafeexport } = await import(
        'zss/feature/wanix/wanixtermiframehost'
      )
      const captured = await iframecapturezedcafeexport()
      if (captured.length > guestfiles.length) {
        guestfiles = captured
        exportfiles = guestfilestoexportfiles(captured)
        apilog(
          device,
          player,
          `wanix vm prep: using iframe export capture (${guestfiles.length} files)`,
        )
      }
    }
    if (iswanixspaceactive()) {
      await iframechildhaltzedcafe()
    }
    stopzedcafepoll()
    setwanixzedcafeready(false)
    setwanixzedcafetaskrid(null)
    apilog(device, player, 'wanix vm prep: fetching linux + v86 archives...')
    const inboxencoded = encodezedcafeinboxjson(exportfiles)
    if (!inboxencoded) {
      apilog(device, player, 'wanix vm prep: zed-cafe export tree invalid')
      return
    }
    const inboxbytes = [...inboxencoded]
    apilog(
      device,
      player,
      `wanix vm prep: staging ${guestfiles.length} export files for vm guest`,
    )
    await spawnwanixvmspace(device, player, undefined, guestfiles, inboxbytes)
    apilog(device, player, `wanix vm prep: ${readwanixvmprepstage()}`)
    const requested = vmid ?? DEFAULT_WANIX_VM_ID
    apilog(device, player, `wanix vm spawn: ${requested}...`)
    const { vmid: spawnedid } = await spawnwanixvm({
      vmid: requested,
      mem: DEFAULT_WANIX_VM_MEM,
      attach: true,
      inboxbytes,
      guestfiles,
    })
    const exportready = await finalizewanixzedcafeaftervmboot(device, player)
    if (!exportready) {
      apilog(
        device,
        player,
        'wanix vm: zedcafe export not ready — /zedcafe/ may be missing in guest',
      )
    }
    registervm({
      id: spawnedid,
      label: spawnedid,
      mem: DEFAULT_WANIX_VM_MEM,
    })
    apilog(device, player, `wanix vm boot ${spawnedid}`)
  } catch (err) {
    const stage = readwanixvmprepstage()
    const prep = readwanixvmpreperror()
    const detail = err instanceof Error ? err.message : String(err)
    const suffix = prep
      ? ` (${prep})`
      : stage !== 'idle' && stage !== 'failed'
        ? ` (stage=${stage})`
        : ''
    apierror(device, player, 'wanix', `${detail}${suffix}`)
  }
}

export async function wanixhandleshownenu(device: DEVICELIKE, player: string) {
  try {
    if (iswanixspaceactive()) {
      await ensurewanixsandbox(device, player)
    }
    const tasks = readwanixtasks()
    const vms = readwanixvms()
    const attached = readwanixattached()
    const attachedkind = readwanixattachedkind()
    const parts: (string | string[])[] = [
      zssheaderlines('wanix'),
      zsstextline('drop a .wasm or .tgz to run'),
      zsstextline('$gray./zedcafe/ mirrors session books; #wanix pull imports guest edits'),
      zsssectionlines('Tasks'),
    ]
    if (tasks.length === 0) {
      parts.push(zsstextline('$grayno tasks running'))
    } else {
      for (const task of tasks) {
        const isattached =
          iswanixtermactive() && attachedkind === 'task' && attached === task.id
        const attachlabel = isattached
          ? `Attach ${task.label} $cyanattached`
          : `Attach ${task.label}`
        parts.push(zsszedlinkline(`wanixattach ${task.id}`, attachlabel))
        parts.push(zsszedlinkline(`wanixstop ${task.id}`, `Stop ${task.label}`))
      }
      parts.push(
        zsszedlinkline('wanixstop', `Stop all (${tasks.length} tasks)`),
      )
    }
    parts.push(zsssectionlines('VMs'))
    if (vms.length === 0) {
      parts.push(zsszedlinkline('wanixvm', 'Boot Linux in v86'))
    } else {
      for (const vm of vms) {
        const isattached =
          iswanixtermactive() && attachedkind === 'vm' && attached === vm.id
        const attachlabel = isattached
          ? `Attach ${vm.label} $cyanattached`
          : `Attach ${vm.label}`
        parts.push(zsszedlinkline(`wanixattach ${vm.id}`, attachlabel))
        parts.push(zsszedlinkline(`wanixvmstop ${vm.id}`, `Stop ${vm.label}`))
      }
      parts.push(zsszedlinkline('wanixvmstop', `Stop all (${vms.length} vms)`))
    }
    if (iswanixtermactive()) {
      parts.push(zsstextline('#wanix detach — stop routing terminal input'))
    }
    parts.push(
      zsstextline(
        '$gray#wanix bridge <ws-url> — export namespace (upstream wanix CLI console protocol)',
      ),
    )
    parts.push(zsssectionlines('Remote'))
    parts.push(zsszedlinkline('wanixremote', 'Remote imports (WSS 9P)'))
    terminalwritelines(device, player, zsstexttape(...parts))
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandlestop(
  device: DEVICELIKE,
  player: string,
  taskid?: string,
) {
  try {
    if (!haswanixtasks() && !iswanixspaceactive()) {
      apilog(device, player, 'wanix idle')
      return
    }
    await ensurewanixsandbox(device, player)
    if (taskid) {
      await haltwanixtask(taskid)
      removetask(taskid)
      apilog(device, player, `wanix halted ${taskid}`)
      return
    }
    const running = readwanixtasks()
    if (running.length === 0) {
      apilog(device, player, 'wanix idle (sandbox warm)')
      return
    }
    await haltwanixtask()
    for (const task of running) {
      removetask(task.id)
    }
    apilog(device, player, `wanix halted ${running.length} tasks`)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandlevmstop(
  device: DEVICELIKE,
  player: string,
  vmid?: string,
) {
  try {
    if (!haswanixvms() && !iswanixspaceactive()) {
      apilog(device, player, 'wanix vm idle')
      return
    }
    await ensurewanixsandbox(device, player)
    if (vmid) {
      await haltwanixvm(vmid)
      removevm(vmid)
      apilog(device, player, `wanix vm halted ${vmid}`)
      return
    }
    const running = readwanixvms()
    if (running.length === 0) {
      apilog(device, player, 'wanix vm idle')
      return
    }
    await haltwanixvm()
    for (const vm of running) {
      removevm(vm.id)
    }
    apilog(device, player, `wanix vm halted ${running.length} vms`)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandletermwrite(
  device: DEVICELIKE,
  player: string,
  line: string,
) {
  try {
    const raw = iswanixtermraw()
    await sendwanixtermwrite(line)
    if (!raw && line.trim() === 'ping') {
      wanixtermscreenwritepong()
    }
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

function readattachlabel(kind: WANIX_ATTACH_KIND, id: string) {
  if (kind === 'vm') {
    return readwanixvm(id)?.label ?? id
  }
  return readwanixtask(id)?.label ?? id
}

export function wanixhandledetach(device: DEVICELIKE, player: string) {
  if (!haswanixcompute()) {
    apierror(device, player, 'wanix', 'nothing running to detach from')
    return
  }
  const attached = readwanixattached()
  const attachedkind = readwanixattachedkind()
  const label =
    attached && attachedkind ? readattachlabel(attachedkind, attached) : 'task'
  leavewanixattachedterminal()
  apilog(
    device,
    player,
    `wanix term detached — ${label} still running (#wanix attach to resume)`,
  )
}

export async function wanixhandleattach(
  device: DEVICELIKE,
  player: string,
  targetid?: string,
) {
  try {
    if (!haswanixcompute()) {
      apierror(device, player, 'wanix', 'nothing running to attach to')
      return
    }
    await ensurewanixsandbox(device, player)
    const tasks = readwanixtasks()
    const vms = readwanixvms()
    let kind: WANIX_ATTACH_KIND | undefined
    let target = targetid
    if (target) {
      if (readwanixvm(target)) {
        kind = 'vm'
      } else if (readwanixtask(target)) {
        kind = 'task'
      } else {
        apierror(device, player, 'wanix', `unknown target: ${target}`)
        return
      }
    } else if (tasks.length + vms.length === 1) {
      if (vms.length === 1) {
        kind = 'vm'
        target = vms[0]?.id
      } else {
        kind = 'task'
        target = tasks[0]?.id
      }
    } else {
      apierror(
        device,
        player,
        'wanix',
        'multiple targets running — use #wanix attach <id>',
      )
      return
    }
    if (!target || !kind) {
      return
    }
    if (
      readwanixattached() === target &&
      readwanixattachedkind() === kind &&
      iswanixtermactive()
    ) {
      return
    }
    await attachwanixtarget(kind, target)
    const label = readattachlabel(kind, target)
    const prompt = kind === 'vm' ? 'wanix-vm' : 'wanix'
    apilog(
      device,
      player,
      `wanix term attached — typing goes to ${label} (${prompt} prompt, #wanix detach to escape routing)`,
    )
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandlepull(device: DEVICELIKE, player: string) {
  try {
    if (!iswanixspaceactive()) {
      await ensurewanixsandbox(device, player)
    }
    await wanixpullzedcafe(device, player)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandleremotemenu(device: DEVICELIKE, player: string) {
  try {
    if (iswanixspaceactive()) {
      await ensurewanixsandbox(device, player)
    }
    const remotes = readwanixremotes()
    const parts: (string | string[])[] = [
      zssheaderlines('wanix remote'),
      zsstextline(
        `$gray#wanix remote connect <wss-url> [dst] (default dst: ${WANIX_REMOTE_DEFAULT_DST})`,
      ),
      zsstextline('$grayInspect via #wanix vm → ls /remote'),
      zsssectionlines('Imports'),
    ]
    if (remotes.length === 0) {
      parts.push(zsstextline('$grayno remote imports'))
    } else {
      for (const remote of remotes) {
        const status = remote.mounted ? '$greenmounted' : '$yellowpending'
        parts.push(
          zsstextline(`$gray${remote.url} → ${remote.mountdst} ${status}`),
        )
        parts.push(
          zsszedlinkline(
            `wanixremotedisconnect ${remote.id}`,
            `Disconnect ${remote.label}`,
          ),
        )
      }
    }
    terminalwritelines(device, player, zsstexttape(...parts))
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandleremoteconnect(
  device: DEVICELIKE,
  player: string,
  url: string,
  mountdst?: string,
) {
  try {
    await ensurewanixsandbox(device, player)
    const remote = await connectwanixremote(url, { mountdst })
    apilog(
      device,
      player,
      `wanix remote: connected ${remote.label} → ${remote.mountdst} (${remote.url})`,
    )
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandleremotedisconnect(
  device: DEVICELIKE,
  player: string,
  remoteid: string,
) {
  try {
    if (!iswanixspaceactive()) {
      apierror(device, player, 'wanix', 'wanix not running')
      return
    }
    await disconnectwanixremote(remoteid)
    apilog(device, player, `wanix remote: disconnected ${remoteid}`)
    await wanixhandleremotemenu(device, player)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandlebridgestart(
  device: DEVICELIKE,
  player: string,
  url: string,
) {
  try {
    await ensurewanixsandbox(device, player)
    parsewanixbridgehosturl(url)
    await startwanixbridge(url.trim())
    const importurl = readwanixbridgeimporturl(url.trim())
    apilog(device, player, `wanix bridge: host connected`)
    apilog(
      device,
      player,
      `wanix bridge: external import — <wanix-bind type="import" src="${importurl}">`,
    )
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandlebridgestop(
  device: DEVICELIKE,
  player: string,
) {
  try {
    if (!iswanixspaceactive()) {
      apierror(device, player, 'wanix', 'wanix bridge not running')
      return
    }
    await stopwanixbridge()
    apilog(device, player, 'wanix bridge: stopped')
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}
