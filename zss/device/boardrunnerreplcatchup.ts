import { streamreplreplicationmemory } from 'zss/device/rxrepl/streamreplreplicationinit'
import {
  streamreplscopedawaitinitialsyncforowned,
  streamreplscopedsyncboards,
  streamreplscopedsyncflagsplayers,
  streamreplscopedsyncgadgetplayers,
} from 'zss/device/rxrepl/streamreplscopedreplication'

export const BOARDRUNNER_REPL_CATCHUP_TIMEOUT_MS = 15_000

type Replwithawait = {
  awaitInitialReplication?: () => Promise<void>
}

async function awaitmemoryinitialreplication(): Promise<void> {
  const mem = streamreplreplicationmemory() as Replwithawait | null
  if (!mem || typeof mem.awaitInitialReplication !== 'function') {
    return
  }
  await mem.awaitInitialReplication()
}

/**
 * Await memory repl, start scoped board/flags/gadget repl instances, then await
 * each scoped repl's initial replication so MEMORY hydration can catch up
 * before boardrunner ticks.
 */
export async function boardrunnerscopedcatchup(
  ownedBoardIds: Set<string>,
  flagPlayerIdsFull: Set<string>,
  gadgetPeerIdsHuman: Set<string>,
): Promise<void> {
  await awaitmemoryinitialreplication()
  await streamreplscopedsyncboards(ownedBoardIds)
  await streamreplscopedsyncflagsplayers(flagPlayerIdsFull)
  await streamreplscopedsyncgadgetplayers(gadgetPeerIdsHuman)
  await streamreplscopedawaitinitialsyncforowned(
    ownedBoardIds,
    flagPlayerIdsFull,
  )
}

export async function boardrunnerscopedcatchupwithtimeout(
  ownedBoardIds: Set<string>,
  flagPlayerIdsFull: Set<string>,
  gadgetPeerIdsHuman: Set<string>,
): Promise<void> {
  const inner = boardrunnerscopedcatchup(
    ownedBoardIds,
    flagPlayerIdsFull,
    gadgetPeerIdsHuman,
  )
  let timeoutid: ReturnType<typeof setTimeout> | undefined
  const t = new Promise<never>((_, reject) => {
    timeoutid = setTimeout(() => {
      reject(
        new Error(
          `boardrunner repl catch-up timed out after ${BOARDRUNNER_REPL_CATCHUP_TIMEOUT_MS}ms`,
        ),
      )
    }, BOARDRUNNER_REPL_CATCHUP_TIMEOUT_MS)
  })
  try {
    await Promise.race([inner, t])
  } finally {
    if (timeoutid !== undefined) {
      clearTimeout(timeoutid)
    }
  }
}
