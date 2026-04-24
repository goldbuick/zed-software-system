import * as init from 'zss/device/rxrepl/streamreplreplicationinit'
import * as scoped from 'zss/device/rxrepl/streamreplscopedreplication'

import * as catchupmod from '../boardrunnerreplcatchup'

const { boardrunnerscopedcatchup } = catchupmod

describe('boardrunnerscopedcatchup', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('awaits memory repl then scoped sync then initial scoped sync', async () => {
    const order: string[] = []
    jest.spyOn(init, 'streamreplreplicationmemory').mockReturnValue({
      awaitInitialReplication: jest.fn(async () => {
        order.push('memory')
      }),
    } as unknown as ReturnType<typeof init.streamreplreplicationmemory>)
    jest.spyOn(scoped, 'streamreplscopedsyncboards').mockImplementation(async () => {
      order.push('boards')
    })
    jest.spyOn(scoped, 'streamreplscopedsyncflagsplayers').mockImplementation(async () => {
      order.push('flags')
    })
    jest.spyOn(scoped, 'streamreplscopedsyncgadgetplayers').mockImplementation(async () => {
      order.push('gadget')
    })
    jest
      .spyOn(scoped, 'streamreplscopedawaitinitialsyncforowned')
      .mockImplementation(async () => {
        order.push('awaitscoped')
      })

    await boardrunnerscopedcatchup(
      new Set(['b1']),
      new Set(['p1', 'el1_chip', 'tracking_b1']),
      new Set(['p1']),
    )

    expect(order).toEqual(['memory', 'boards', 'flags', 'gadget', 'awaitscoped'])
    expect(scoped.streamreplscopedawaitinitialsyncforowned).toHaveBeenCalledWith(
      new Set(['b1']),
      new Set(['p1', 'el1_chip', 'tracking_b1']),
    )
  })

  it('skips memory await when streamreplreplicationmemory is null', async () => {
    const order: string[] = []
    jest.spyOn(init, 'streamreplreplicationmemory').mockReturnValue(null)
    jest.spyOn(scoped, 'streamreplscopedsyncboards').mockImplementation(async () => {
      order.push('boards')
    })
    jest.spyOn(scoped, 'streamreplscopedsyncflagsplayers').mockResolvedValue(undefined)
    jest.spyOn(scoped, 'streamreplscopedsyncgadgetplayers').mockResolvedValue(undefined)
    jest
      .spyOn(scoped, 'streamreplscopedawaitinitialsyncforowned')
      .mockResolvedValue(undefined)

    await boardrunnerscopedcatchup(new Set(), new Set(['p1']), new Set(['p1']))

    expect(order).toEqual(['boards'])
  })
})

