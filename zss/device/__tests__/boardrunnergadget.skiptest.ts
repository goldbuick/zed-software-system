import type { DEVICE } from 'zss/device'
import * as api from 'zss/device/api'
import * as gadgetapi from 'zss/gadget/data/api'
import * as bookoperations from 'zss/memory/bookoperations'
import * as playermanagement from 'zss/memory/playermanagement'
import * as rendering from 'zss/memory/rendering'
import * as session from 'zss/memory/session'
import * as synthstate from 'zss/memory/synthstate'

import {
  boardrunnergadgetclearsyncbaseline,
  boardrunnergadgetsynctick,
} from '../boardrunnergadget'

describe('boardrunnergadgetsynctick when player board not hydrated', () => {
  const dev = { emit: jest.fn() } as unknown as DEVICE

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('does not emit patch or paint and does not read gadgetstate when playerboard is undefined', () => {
    jest.spyOn(playermanagement, 'memoryreadplayerboard').mockReturnValue(undefined)
    const patchspy = jest.spyOn(api, 'gadgetclientpatch')
    const paintspy = jest.spyOn(api, 'gadgetclientpaint')
    const gadgetstatespy = jest.spyOn(gadgetapi, 'gadgetstate')

    boardrunnergadgetsynctick(dev, ['p1'])

    expect(patchspy).not.toHaveBeenCalled()
    expect(paintspy).not.toHaveBeenCalled()
    expect(gadgetstatespy).not.toHaveBeenCalled()
  })

  it('does not paint when baseline cleared but gadgetlayers is missing', () => {
    boardrunnergadgetclearsyncbaseline('p1')
    jest.spyOn(session, 'memoryreadbookbysoftware').mockReturnValue({} as any)
    jest.spyOn(bookoperations, 'memoryreadbookflag').mockReturnValue('sid_x')
    jest.spyOn(playermanagement, 'memoryreadplayerboard').mockReturnValue({
      id: 'sid_x',
      name: 'NB',
    } as any)
    jest
      .spyOn(rendering, 'memoryreadgadgetlayers')
      .mockReturnValue(undefined as any)
    jest.spyOn(synthstate, 'memoryreadsynth').mockReturnValue(undefined as any)
    const paintspy = jest.spyOn(api, 'gadgetclientpaint')
    const patchspy = jest.spyOn(api, 'gadgetclientpatch')

    boardrunnergadgetsynctick(dev, ['p1'])

    expect(paintspy).not.toHaveBeenCalled()
    expect(patchspy).not.toHaveBeenCalled()
  })
})
