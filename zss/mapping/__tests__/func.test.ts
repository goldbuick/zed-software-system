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
      const mockDevice = {} as any
      const mockPlayer = 'test-player'
      const asyncFunc = jest.fn().mockResolvedValue(undefined)

      doasync(mockDevice, mockPlayer, asyncFunc)

      // Wait for async function to complete
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(asyncFunc).toHaveBeenCalledTimes(1)
    })

    it('should handle successful async execution', async () => {
      const mockDevice = {} as any
      const mockPlayer = 'test-player'
      const asyncFunc = jest.fn().mockResolvedValue(undefined)

      doasync(mockDevice, mockPlayer, asyncFunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(apierror).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should catch and handle errors', async () => {
      const mockDevice = {} as any
      const mockPlayer = 'test-player'
      const error = new Error('Test error')
      const asyncFunc = jest.fn().mockRejectedValue(error)

      doasync(mockDevice, mockPlayer, asyncFunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(console.error).toHaveBeenCalledWith(error)
      expect(apierror).toHaveBeenCalledWith(
        mockDevice,
        mockPlayer,
        'crash',
        'Test error',
      )
    })

    it('should handle errors without message', async () => {
      const mockDevice = {} as any
      const mockPlayer = 'test-player'
      const error = new Error()
      const asyncFunc = jest.fn().mockRejectedValue(error)

      doasync(mockDevice, mockPlayer, asyncFunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(console.error).toHaveBeenCalledWith(error)
      expect(apierror).toHaveBeenCalledWith(mockDevice, mockPlayer, 'crash', '')
    })

    it('should handle non-Error rejections', async () => {
      const mockDevice = {} as any
      const mockPlayer = 'test-player'
      const asyncFunc = jest.fn().mockRejectedValue('string error')

      doasync(mockDevice, mockPlayer, asyncFunc)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(console.error).toHaveBeenCalledWith('string error')
      // When rejecting with a string, error?.message is undefined
      expect(apierror).toHaveBeenCalledWith(
        mockDevice,
        mockPlayer,
        'crash',
        undefined,
      )
    })
  })
})
