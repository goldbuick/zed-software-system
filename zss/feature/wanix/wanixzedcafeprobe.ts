export type WanixZedCafeExportProbe = {
  taskrid: string | null
  zedcafeready: boolean
  wasm_cmd: string | null
  inbox_ramfs_bytes: number | string
  inbox_task_bytes: number | string
  export_listing: string[] | null
  export_error: string | null
}
