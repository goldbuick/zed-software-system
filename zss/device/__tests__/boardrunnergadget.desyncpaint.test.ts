import type { DEVICELIKE } from 'zss/device/api'
import * as gadgetapi from 'zss/gadget/data/api'
import * as compress from 'zss/gadget/data/compress'

import { boardrunnergadgetdesyncpaint } from '../boardrunnergadget'
import * as jsonsyncclient from '../jsonsyncclient'

describe('boardrunnergadgetdesyncpaint', () => {
  const dev: DEVICELIKE = {
    emit: jest.fn(),
  }

  beforeEach(() => {
    jest.mocked(dev.emit).mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('emits rxreplserver:push_batch with gadget slim when exportgadgetstate returns a slim doc', () => {
    jest
      .spyOn(jsonsyncclient, 'jsonsyncclientreadownplayer')
      .mockReturnValue('runner1')
    const gadget = { board: 'b1' } as any
    jest.spyOn(gadgetapi, 'gadgetstate').mockReturnValue(gadget)
    jest
      .spyOn(compress, 'exportgadgetstate')
      .mockReturnValue([['layers', []]] as any)

    boardrunnergadgetdesyncpaint(dev as any, 'p1')

    expect(dev.emit).toHaveBeenCalledWith(
      'runner1',
      'rxreplserver:push_batch',
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({
            streamid: 'gadget:p1',
            document: expect.any(Array),
          }),
        ]),
      }),
    )
  })

  it('does not emit when exportgadgetstate returns undefined', () => {
    jest.spyOn(gadgetapi, 'gadgetstate').mockReturnValue({} as any)
    jest.spyOn(compress, 'exportgadgetstate').mockReturnValue(undefined as any)

    boardrunnergadgetdesyncpaint(dev as any, 'p1')

    expect(dev.emit).not.toHaveBeenCalled()
  })

  it('does not emit when gadget has no board, layers, or sidebar', () => {
    jest.spyOn(gadgetapi, 'gadgetstate').mockReturnValue({
      board: '',
      layers: [],
      sidebar: [],
    } as any)
    const exportspy = jest.spyOn(compress, 'exportgadgetstate')

    boardrunnergadgetdesyncpaint(dev as any, 'p1')

    expect(exportspy).not.toHaveBeenCalled()
    expect(dev.emit).not.toHaveBeenCalled()
  })
})
