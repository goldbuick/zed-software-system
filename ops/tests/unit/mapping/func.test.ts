import { apierror } from 'zss/device/api'
import { doasync } from 'zss/mapping/func'

// Mock the apierror function
jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

describe('func', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('doasync', () => {
    it('should execute async function', async () => {
      const mockdevice = {} as any
      const mockplayer = 'test-player'
      const asyncfunc = jest.fn().mockResolvedValue(undefined)

      doasync(mockdevice, mockplayer, asyncfunc)

      // Wait for async function to complete
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(asyncfunc).toHaveBeenCalledTimes(1)
    })

    it('should handle successful async execution', async () => {
      const mockdevice = {} as any
      const mockplayer = 'test-player'
      const asyncfunc = jest.fn().mockResolvedValue(undefined)

      doasync(mockdevice, mockplayer, asyncfunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(apierror).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should catch and handle errors', async () => {
      const mockdevice = {} as any
      const mockplayer = 'test-player'
      const error = new Error('Test error')
      const asyncfunc = jest.fn().mockRejectedValue(error)

      doasync(mockdevice, mockplayer, asyncfunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(console.error).toHaveBeenCalledWith(error)
      expect(apierror).toHaveBeenCalledWith(
        mockdevice,
        mockplayer,
        'crash',
        'Test error',
      )
    })

    it('should handle errors without message', async () => {
      const mockdevice = {} as any
      const mockplayer = 'test-player'
      const error = new Error()
      const asyncfunc = jest.fn().mockRejectedValue(error)

      doasync(mockdevice, mockplayer, asyncfunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(console.error).toHaveBeenCalledWith(error)
      expect(apierror).toHaveBeenCalledWith(mockdevice, mockplayer, 'crash', '')
    })

    it('should handle non-Error rejections', async () => {
      const mockdevice = {} as any
      const mockplayer = 'test-player'
      const asyncfunc = jest.fn().mockRejectedValue('string error')

      doasync(mockdevice, mockplayer, asyncfunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(console.error).toHaveBeenCalledWith('string error')
      // When rejecting with a string, error?.message is undefined
      expect(apierror).toHaveBeenCalledWith(
        mockdevice,
        mockplayer,
        'crash',
        undefined,
      )
    })
  })
})
