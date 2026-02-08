import {
  createinfohash,
  createnameid,
  createpid,
  createshortnameid,
  createsid,
  createtopic,
  ispid,
  issid,
} from 'zss/mapping/guid'

describe('guid', () => {
  describe('createsid', () => {
    it('should create a sid with correct prefix', () => {
      const sid = createsid()
      expect(sid).toMatch(/^sid_/)
      expect(sid.length).toBeGreaterThan(4)
    })

    it('should create unique sids', () => {
      const sid1 = createsid()
      const sid2 = createsid()
      expect(sid1).not.toBe(sid2)
    })

    it('should not contain dashes', () => {
      const sid = createsid()
      expect(sid).not.toContain('-')
    })
  })

  describe('issid', () => {
    it('should identify valid sids', () => {
      expect(issid('sid_test123')).toBe(true)
      expect(issid('sid_')).toBe(true)
    })

    it('should reject non-sids', () => {
      expect(issid('pid_test')).toBe(false)
      expect(issid('test')).toBe(false)
      expect(issid('')).toBe(false)
    })

    it('should handle undefined and null', () => {
      expect(issid(undefined)).toBe(false)
      expect(issid(null as any)).toBe(false)
    })
  })

  describe('createpid', () => {
    it('should create a pid with correct prefix', () => {
      const pid = createpid()
      expect(pid).toMatch(/^pid_/)
    })

    it('should have correct format', () => {
      const pid = createpid()
      const parts = pid.split('_')
      expect(parts.length).toBe(3)
      expect(parts[0]).toBe('pid')
      expect(parts[1].length).toBe(4)
      expect(parts[2].length).toBe(16)
    })

    it('should create unique pids', () => {
      const pid1 = createpid()
      const pid2 = createpid()
      expect(pid1).not.toBe(pid2)
    })
  })

  describe('createtopic', () => {
    it('should create a topic string', () => {
      const topic = createtopic()
      expect(typeof topic).toBe('string')
      expect(topic.length).toBeGreaterThan(0)
    })

    it('should create unique topics', () => {
      const topic1 = createtopic()
      const topic2 = createtopic()
      expect(topic1).not.toBe(topic2)
    })
  })

  describe('ispid', () => {
    it('should identify valid pids', () => {
      expect(ispid('pid_1234_abcdefghijklmnop')).toBe(true)
      expect(ispid('pid_')).toBe(true)
    })

    it('should reject non-pids', () => {
      expect(ispid('sid_test')).toBe(false)
      expect(ispid('test')).toBe(false)
      expect(ispid('')).toBe(false)
    })

    it('should handle undefined and null', () => {
      expect(ispid(undefined)).toBe(false)
      expect(ispid(null as any)).toBe(false)
    })
  })

  describe('createnameid', () => {
    it('should create a name id', () => {
      const nameid = createnameid()
      expect(typeof nameid).toBe('string')
      expect(nameid.length).toBeGreaterThan(0)
    })

    it('should create unique name ids', () => {
      const nameid1 = createnameid()
      const nameid2 = createnameid()
      expect(nameid1).not.toBe(nameid2)
    })
  })

  describe('createshortnameid', () => {
    it('should create a short name id', () => {
      const nameid = createshortnameid()
      expect(typeof nameid).toBe('string')
      expect(nameid.length).toBeGreaterThan(0)
    })

    it('should create unique short name ids', () => {
      const nameid1 = createshortnameid()
      const nameid2 = createshortnameid()
      expect(nameid1).not.toBe(nameid2)
    })
  })

  describe('createinfohash', () => {
    it('should create an infohash from source string', () => {
      const hash = createinfohash('test-source')
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(20)
    })

    it('should create consistent hashes for same source', () => {
      const hash1 = createinfohash('test-source')
      const hash2 = createinfohash('test-source')
      expect(hash1).toBe(hash2)
    })

    it('should create different hashes for different sources', () => {
      const hash1 = createinfohash('source1')
      const hash2 = createinfohash('source2')
      expect(hash1).not.toBe(hash2)
    })

    it('should only contain valid hex characters', () => {
      const hash = createinfohash('test')
      const validChars = /^[A-Za-z0-9]+$/
      expect(hash).toMatch(validChars)
    })
  })
})
