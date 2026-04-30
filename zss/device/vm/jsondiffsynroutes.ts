import {
  boardsynensurehub,
  ensurejsondiffsynflagshub,
  refreshmemoryhubstreamingore,
} from 'zss/device/vm/jsondiffsyncstreams'
import { jsondiffsync } from 'zss/device/vm/state'
import type { HUB_SESSION } from 'zss/feature/jsondiffsync/types'
import {
  JSONDIFFSYNC_STREAM_BOARD,
  JSONDIFFSYNC_STREAM_FLAGS,
  JSONDIFFSYNC_STREAM_MEMORY,
} from 'zss/feature/jsondiffsync/types'

export function resolvejsonsynhub(
  streamid: string,
  boardsynctarget?: string,
): HUB_SESSION | undefined {
  if (streamid === JSONDIFFSYNC_STREAM_MEMORY) {
    refreshmemoryhubstreamingore(jsondiffsync)
    return jsondiffsync
  }
  if (streamid === JSONDIFFSYNC_STREAM_FLAGS) {
    return ensurejsondiffsynflagshub()
  }
  if (streamid === JSONDIFFSYNC_STREAM_BOARD) {
    if (typeof boardsynctarget !== 'string' || boardsynctarget.length === 0) {
      return undefined
    }
    return boardsynensurehub(boardsynctarget)
  }
  return undefined
}
