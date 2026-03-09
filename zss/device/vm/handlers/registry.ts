import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

import { handleAdmin } from './admin'
import {
  handleAgentlist,
  handleAgentprompt,
  handleAgentstart,
  handleAgentstop,
} from './agent'
import {
  handleLocal,
  handleLogin,
  handleLogout,
  handlePlayertoken,
  handleSearch,
} from './auth'
import { handleBooks } from './books'
import { handleCli, handleClirepeatlast } from './cli'
import { handleCoderelease, handleCodewatch } from './codewatch'
import { handleDefault } from './default'
import { handleDoot } from './doot'
import { handleFlush } from './flush'
import { handleFork } from './fork'
import { handleHalt } from './halt'
import { handleInput } from './input'
import { handleFindany, handleInspect } from './inspect'
import { handleLoader } from './loader'
import { handleLook } from './look'
import { handleOperator } from './operator'
import { handlePublish } from './publish'
import { handleRestart } from './restart'
import {
  handleClearscroll,
  handleMakeitscroll,
  handleRefscroll,
} from './scroll'
import { handleSecond } from './second'
import { handleTick } from './tick'
import { handleTopic } from './topic'
import { handleReadzipfilelist } from './zipfile'
import { handleZsswords } from './zsswords'
import { handleZztrandom, handleZztsearch } from './zzt'

export type VM_HANDLER = (vm: DEVICE, message: MESSAGE) => void

export const vmhandlers: Record<string, VM_HANDLER> = {
  operator: handleOperator,
  topic: handleTopic,
  admin: handleAdmin,
  zsswords: handleZsswords,
  books: handleBooks,
  search: handleSearch,
  logout: handleLogout,
  login: handleLogin,
  playertoken: handlePlayertoken,
  local: handleLocal,
  doot: handleDoot,
  input: handleInput,
  look: handleLook,
  agentstart: handleAgentstart,
  agentstop: handleAgentstop,
  agentlist: handleAgentlist,
  agentprompt: handleAgentprompt,
  codewatch: handleCodewatch,
  coderelease: handleCoderelease,
  clearscroll: handleClearscroll,
  halt: handleHalt,
  tick: handleTick,
  second: handleSecond,
  makeitscroll: handleMakeitscroll,
  refscroll: handleRefscroll,
  readzipfilelist: handleReadzipfilelist,
  fork: handleFork,
  zztsearch: handleZztsearch,
  zztrandom: handleZztrandom,
  publish: handlePublish,
  flush: handleFlush,
  cli: handleCli,
  clirepeatlast: handleClirepeatlast,
  restart: handleRestart,
  inspect: handleInspect,
  findany: handleFindany,
  loader: handleLoader,
}

export { handleDefault as vmdefaulthandler }
