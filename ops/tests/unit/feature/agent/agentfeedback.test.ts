import { apichat, workstatus } from 'zss/device/api'
import {
  createagentfeedback,
  humanizeagenttoolname,
  isagentdownloadstatus,
  sanitizeagentchattext,
} from 'zss/feature/agent/agentfeedback'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'

jest.mock('zss/device/api', () => ({
  apichat: jest.fn(),
  workstatus: jest.fn(),
}))

jest.mock('zss/gadget/data/zustandstores', () => ({
  useGadgetClient: {
    getState: jest.fn(() => ({ gadget: { board: 'board_title' } })),
  },
}))

const mockapichat = apichat as jest.Mock
const mockworkstatus = workstatus as jest.Mock

describe('agentfeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useGadgetClient.getState as jest.Mock).mockReturnValue({
      gadget: { board: 'board_title' },
    })
  })

  it('maps tool names to human statuses', () => {
    expect(humanizeagenttoolname('read_zedcafe')).toBe('reading board')
    expect(humanizeagenttoolname('write_zedcafe')).toBe('writing terrain')
    expect(humanizeagenttoolname('apply_zedcafe_batch')).toBe(
      'applying changes',
    )
    expect(humanizeagenttoolname('run_cli_command')).toBe('running command')
  })

  it('detects download percentages for workstatus-only path', () => {
    expect(isagentdownloadstatus('agent dl 42%')).toBe(true)
    expect(isagentdownloadstatus('agent dl 3/12 · 41%')).toBe(true)
    expect(isagentdownloadstatus('agent thinking')).toBe(false)
  })

  it('sanitizes and caps chat text', () => {
    expect(sanitizeagentchattext('$green hello $blue world')).toBe('hello world')
    expect(sanitizeagentchattext('x'.repeat(400)).length).toBe(280)
  })

  it('posts milestones to chat and status, and deduplicates chat', () => {
    const feedback = createagentfeedback(
      { emit: jest.fn() } as never,
      'pid_1',
    )
    feedback.tool('read_zedcafe')
    feedback.tool('read_zedcafe')
    expect(mockworkstatus).toHaveBeenCalledWith(
      expect.anything(),
      'pid_1',
      'reading board',
    )
    expect(mockapichat).toHaveBeenCalledTimes(1)
    expect(mockapichat).toHaveBeenCalledWith(
      expect.anything(),
      'board_title',
      '$cyanagent$blue>>',
      'reading board',
    )
  })

  it('keeps download percentages on workstatus only when caller status-only', () => {
    const feedback = createagentfeedback(
      { emit: jest.fn() } as never,
      'pid_1',
    )
    feedback.status('agent dl 3/12 · 41%')
    expect(mockworkstatus).toHaveBeenCalledWith(
      expect.anything(),
      'pid_1',
      'agent dl 3/12 · 41%',
    )
    expect(mockapichat).not.toHaveBeenCalled()
  })
})
