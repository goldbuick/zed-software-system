import type { DEVICELIKE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { pickwanixbundleentry } from 'zss/feature/wanix/wanixbundle'
import { uniquewanixtaskid } from 'zss/feature/wanix/wanixcmd'
import {
  attachwanixtarget,
  ensurewanixsandbox,
  haltwanixtask,
  haltwanixvm,
  iswanixspaceactive,
  listwanixbinds,
  listwanixdir,
  mountwanixarchive,
  putwanixfile,
  readwanixstatus,
  readwanixvmpreperror,
  readwanixvmprepstage,
  sendwanixtermwrite,
  setwanixtaskexithandler,
  setwanixvmexithandler,
  spawnwanixtask,
  spawnwanixvm,
  spawnwanixvmspace,
  unmountallwanixbinds,
  unmountwanixbind,
} from 'zss/feature/wanix/wanixhost'
import {
  type WANIX_ATTACH_KIND,
  haswanixcompute,
  haswanixtasks,
  haswanixvms,
  iswanixtermactive,
  iswanixtermraw,
  readwanixattached,
  readwanixattachedkind,
  readwanixtask,
  readwanixtasks,
  readwanixvm,
  readwanixvms,
  registertask,
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
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

let exitdevice: DEVICELIKE | undefined
let exitplayer = ''

function ensuretaskexithandler() {
  setwanixtaskexithandler((taskid, code) => {
    const wasattached =
      readwanixattached() === taskid && readwanixattachedkind() === 'task'
    removetask(taskid)
    if (wasattached) {
      leavewanixattachedterminal()
    }
    if (exitdevice && exitplayer) {
      apilog(exitdevice, exitplayer, `wanix exit ${taskid} ${code}`)
    }
  })
}

function ensurevmexithandler() {
  setwanixvmexithandler((vmid, code) => {
    const wasattached =
      readwanixattached() === vmid && readwanixattachedkind() === 'vm'
    removevm(vmid)
    if (wasattached) {
      leavewanixattachedterminal()
    }
    if (exitdevice && exitplayer) {
      apilog(exitdevice, exitplayer, `wanix vm exit ${vmid} ${code}`)
    }
  })
}

export function iswanixwasmfile(name: string, bytes: Uint8Array): boolean {
  if (/\.wasm$/i.test(name)) {
    return true
  }
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  )
}

export function iswanixbundlefile(name: string): boolean {
  return /\.tgz$/i.test(name) || /\.tar\.gz$/i.test(name)
}

async function launchwanixload(
  device: DEVICELIKE,
  player: string,
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
  await ensurewanixsandbox(device, player)
  exitdevice = device
  exitplayer = player
  ensuretaskexithandler()

  const taskid = uniquewanixtaskid(
    label,
    readwanixtasks().map((task) => task.id),
  )
  let entrycmd = label
  if (kind === 'wasm') {
    await putwanixfile(label, bytes)
  } else {
    const bundleprefix = `bundle-${taskid}`
    await mountwanixarchive(label, bytes, bundleprefix)
    const rootentries = await listwanixdir('.')
    let bundleentries: string[] | null = null
    try {
      bundleentries = await listwanixdir(bundleprefix)
    } catch {
      bundleentries = null
    }
    entrycmd = pickwanixbundleentry(rootentries, bundleentries, bundleprefix)
  }

  const { taskid: spawnedid } = await spawnwanixtask(entrycmd, {
    taskid,
    attach: true,
    wait: false,
  })
  registertask({ id: spawnedid, label, entrycmd })
  apilog(device, player, `wanix run ${spawnedid} ${entrycmd}`)
}

export async function wanixhandledrop(
  device: DEVICELIKE,
  player: string,
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
  try {
    await launchwanixload(device, player, label, kind, bytes)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandlevmstart(
  device: DEVICELIKE,
  player: string,
  vmid?: string,
) {
  try {
    exitdevice = device
    exitplayer = player
    ensurevmexithandler()
    if (iswanixspaceactive()) {
      const status = await readwanixstatus()
      if (!status.vmbindsready && haswanixcompute()) {
        apilog(
          device,
          player,
          'wanix vm prep: rebooting wanix host for vm layout (stops tasks)',
        )
      }
    }
    apilog(device, player, 'wanix vm prep: fetching linux + v86 archives...')
    await spawnwanixvmspace(device, player)
    apilog(device, player, `wanix vm prep: ${readwanixvmprepstage()}`)
    ensurevmexithandler()
    const requested = vmid ?? DEFAULT_WANIX_VM_ID
    apilog(device, player, `wanix vm spawn: ${requested}...`)
    const { vmid: spawnedid } = await spawnwanixvm({
      vmid: requested,
      mem: DEFAULT_WANIX_VM_MEM,
      attach: true,
      wait: false,
    })
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
    const binds = iswanixspaceactive() ? await listwanixbinds() : []
    const parts: (string | string[])[] = [
      zssheaderlines('wanix'),
      zsstextline('drop a .wasm or .tgz to run'),
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
        parts.push(zsszedlinkline(`wanix attach ${task.id}`, attachlabel))
        parts.push(
          zsszedlinkline(`wanix stop ${task.id}`, `Stop ${task.label}`),
        )
      }
      parts.push(
        zsszedlinkline('wanix stop', `Stop all (${tasks.length} tasks)`),
      )
    }
    parts.push(zsssectionlines('VMs'))
    if (vms.length === 0) {
      parts.push(zsszedlinkline('wanix vm', 'Boot Linux in v86'))
    } else {
      for (const vm of vms) {
        const isattached =
          iswanixtermactive() && attachedkind === 'vm' && attached === vm.id
        const attachlabel = isattached
          ? `Attach ${vm.label} $cyanattached`
          : `Attach ${vm.label}`
        parts.push(zsszedlinkline(`wanix attach ${vm.id}`, attachlabel))
        parts.push(zsszedlinkline(`wanix vm stop ${vm.id}`, `Stop ${vm.label}`))
      }
      parts.push(
        zsszedlinkline('wanix vm stop', `Stop all (${vms.length} vms)`),
      )
    }
    parts.push(zsssectionlines('Binds'))
    if (binds.length === 0) {
      parts.push(zsstextline('$grayno mounts'))
    } else {
      for (const bind of binds) {
        parts.push(
          zsszedlinkline(`wanix unbind ${bind.id}`, `Unmount ${bind.label}`),
        )
      }
      parts.push(
        zsszedlinkline(
          'wanix unbind all',
          `Unmount all (${binds.length} binds)`,
        ),
      )
    }
    if (iswanixtermactive()) {
      parts.push(zsstextline('#wanix detach — stop routing terminal input'))
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

export async function parsewanixwasm(player: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await wanixhandledrop(SOFTWARE, player, file.name, 'wasm', bytes)
}

export async function parsewanixbundle(player: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await wanixhandledrop(SOFTWARE, player, file.name, 'bundle', bytes)
}

export async function wanixhandletermwrite(
  device: DEVICELIKE,
  player: string,
  line: string,
) {
  try {
    const raw = iswanixtermraw()
    await sendwanixtermwrite(line, { raw })
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

export async function wanixhandleunbind(
  device: DEVICELIKE,
  player: string,
  target: string,
) {
  try {
    await ensurewanixsandbox(device, player)
    if (target === 'all') {
      const removed = await unmountallwanixbinds()
      if (removed.length === 0) {
        apilog(device, player, 'wanix nothing to unbind')
        return
      }
      apilog(device, player, `wanix unmounted ${removed.length} binds`)
      return
    }
    const binds = await listwanixbinds()
    const match = binds.find((bind) => bind.id === target)
    await unmountwanixbind(target)
    apilog(device, player, `wanix unmounted ${match?.label ?? target}`)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}
