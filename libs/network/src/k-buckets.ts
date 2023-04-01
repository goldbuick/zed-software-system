import mitt, { Emitter } from 'mitt'
import { range } from '@zss/system/mapping/array'
import { randomInteger } from '@zss/system/mapping/number'

const NUMBER_OF_NODES_PER_K_BUCKET = 20
const NUMBER_OF_NODES_TO_PING = 3

export type Contact = {
  id: Uint8Array
  peerId: string
  created: number
  [k: string]: any
}

type Bucket =
  | {
      contacts: Contact[]
      dontSplit: boolean
      left: null
      right: null
    }
  | {
      contacts: null
      dontSplit: boolean
      left: Bucket
      right: Bucket
    }

type BucketEvents = {
  added: Contact
  removed: Contact
  updated: { incumbent: Contact; selection: Contact }
  ping: {
    oldContacts: Contact[]
    newContact: Contact
  }
}

function arrayEquals(array1: Uint8Array, array2: Uint8Array): boolean {
  if (array1 === array2) {
    return true
  }
  if (array1.length !== array2.length) {
    return false
  }
  for (let i = 0, length = array1.length; i < length; ++i) {
    if (array1[i] !== array2[i]) {
      return false
    }
  }
  return true
}

function createBucket(): Bucket {
  return { contacts: [], dontSplit: false, left: null, right: null }
}

function ensureInt8(name: string, val: any) {
  if (!(val instanceof Uint8Array)) {
    throw new TypeError(name + ' is not a Uint8Array')
  }
}

function arbiter(incumbent: Contact, candidate: Contact): Contact {
  return incumbent.created > candidate.created ? incumbent : candidate
}

function distance(firstId: Uint8Array, secondId: Uint8Array): number {
  let distance = 0
  let i = 0
  const min = Math.min(firstId.length, secondId.length)
  const max = Math.max(firstId.length, secondId.length)
  for (; i < min; ++i) {
    distance = distance * 256 + (firstId[i] ^ secondId[i])
  }
  for (; i < max; ++i) distance = distance * 256 + 255
  return distance
}

function determineBucket(
  bucket: Bucket,
  id: Uint8Array,
  bitIndex: number,
): Bucket {
  if (bucket.contacts) {
    return bucket
  }

  const bytesDescribedByBitIndex = bitIndex >> 3
  const bitIndexWithinByte = bitIndex % 8
  if (id.length <= bytesDescribedByBitIndex && bitIndexWithinByte !== 0) {
    return bucket.left
  }

  const byteUnderConsideration = id[bytesDescribedByBitIndex]
  if (byteUnderConsideration & (1 << (7 - bitIndexWithinByte))) {
    return bucket.right
  }

  return bucket.left
}

export class KBuckets {
  private root: Bucket
  emitter: Emitter<BucketEvents>

  constructor(private localBucketId: Uint8Array) {
    this.emitter = mitt()
    this.root = createBucket()
  }

  static createId() {
    return new Uint8Array(range(32).map(() => randomInteger(0, 255)))
  }

  static createContact(id: Uint8Array, props = {}) {
    ensureInt8('id', id)
    return {
      ...props,
      id,
      created: Date.now(),
    }
  }

  add(contact: Contact) {
    ensureInt8('contact.id', contact.id)

    let bitIndex = 0
    let bucket = this.root
    while (bucket.contacts === null) {
      bucket = determineBucket(bucket, contact.id, bitIndex++)
    }

    // check if the contact already exists
    const index = this.indexOf(bucket, contact.id)
    if (index >= 0) {
      this.update(bucket, index, contact)
      return
    }

    if (bucket.contacts.length < NUMBER_OF_NODES_PER_K_BUCKET) {
      bucket.contacts.push(contact)
      this.emitter.emit('added', contact)
      return
    }

    // the bucket is full
    if (bucket.dontSplit) {
      this.emitter.emit('ping', {
        oldContacts: bucket.contacts.slice(0, NUMBER_OF_NODES_TO_PING),
        newContact: contact,
      })
      return
    }

    this.split(bucket, bitIndex)
    this.add(contact)
  }

  closest(id: Uint8Array, n = Infinity): Contact[] {
    // sanity checks
    ensureInt8('id', id)
    if ((!Number.isInteger(n) && n !== Infinity) || n <= 0) {
      throw new TypeError('n is not positive number')
    }

    let contacts: Contact[] = []
    for (
      let buckets = [this.root], bitIndex = 0;
      buckets.length > 0 && contacts.length < n;

    ) {
      const bucket = buckets.pop()
      if (bucket) {
        if (bucket.contacts === null) {
          const detNode = determineBucket(bucket, id, bitIndex++)
          buckets.push(bucket.left === detNode ? bucket.right : bucket.left)
          buckets.push(detNode)
        } else {
          contacts = contacts.concat(bucket.contacts)
        }
      }
    }

    const pairs: [number, Contact][] = contacts.map((a) => [
      distance(a.id, id),
      a,
    ])

    return pairs
      .sort((a, b) => a[0] - b[0])
      .slice(0, n)
      .map((a) => a[1])
  }

  count() {
    // return this.toArray().length
    let count = 0
    for (const buckets: (Bucket | null)[] = [this.root]; buckets.length > 0; ) {
      const bucket = buckets.pop()
      if (bucket) {
        if (bucket.contacts === null) {
          buckets.push(bucket.right, bucket.left)
        } else {
          count += bucket.contacts.length
        }
      }
    }
    return count
  }

  get(id: Uint8Array) {
    ensureInt8('id', id)

    let bitIndex = 0
    let bucket = this.root
    while (bucket.contacts === null) {
      bucket = determineBucket(bucket, id, bitIndex++)
    }

    // index of uses contact id for matching
    const index = this.indexOf(bucket, id)
    return index >= 0 ? bucket.contacts[index] : null
  }

  remove(id: Uint8Array) {
    ensureInt8('the id as parameter 1', id)

    let bitIndex = 0
    let node = this.root
    while (node.contacts === null) {
      node = determineBucket(node, id, bitIndex++)
    }

    const index = this.indexOf(node, id)
    if (index >= 0) {
      const contact = node.contacts.splice(index, 1)[0]
      this.emitter.emit('removed', contact)
    }

    return this
  }

  toArray() {
    let result: Contact[] = []
    for (const buckets: (Bucket | null)[] = [this.root]; buckets.length > 0; ) {
      const node = buckets.pop()
      if (node) {
        if (node.contacts === null) {
          buckets.push(node.right, node.left)
        } else {
          result = result.concat(node.contacts)
        }
      }
    }
    return result
  }

  *toIterable() {
    for (const buckets: (Bucket | null)[] = [this.root]; buckets.length > 0; ) {
      const node = buckets.pop()
      if (node) {
        if (node.contacts === null) {
          buckets.push(node.right, node.left)
        } else {
          yield* node.contacts
        }
      }
    }
  }

  private indexOf(bucket: Bucket, id: Uint8Array) {
    if (bucket.contacts) {
      for (let i = 0; i < bucket.contacts.length; ++i) {
        if (arrayEquals(bucket.contacts[i].id, id)) {
          return i
        }
      }
    }
    return -1
  }

  private split(bucket: Bucket, bitIndex: number) {
    if (bucket.contacts === null) {
      return
    }

    // redistribute existing contacts amongst the two newly created buckets
    for (const contact of bucket.contacts) {
      const item = determineBucket(bucket, contact.id, bitIndex)
      if (item.contacts) {
        item.contacts.push(contact)
      }
    }

    // convert to inner tree bucket
    const left = createBucket()
    const right = createBucket()
    Object.assign(bucket, {
      contacts: null,
      left,
      right,
    })

    // don't split the "far away" bucket
    const detNode = determineBucket(bucket, this.localBucketId, bitIndex)
    // we check where the local bucket would end up and mark the other one as
    // "dontSplit" (i.e. "far away")
    const otherNode = left === detNode ? right : left
    otherNode.dontSplit = true
  }

  private update(bucket: Bucket, index: number, contact: Contact) {
    // sanity checks
    if (bucket.contacts === null) {
      throw new Error('update cannot be called on an inner tree bucket')
    }
    if (!arrayEquals(bucket.contacts[index].id, contact.id)) {
      throw new Error('wrong index for update')
    }

    const incumbent = bucket.contacts[index]
    const selection = arbiter(incumbent, contact)

    // if the selection is our old contact and the candidate is some new
    // contact, then there is nothing to do
    if (selection === incumbent && incumbent !== contact) {
      return
    }

    bucket.contacts.splice(index, 1) // remove old contact
    bucket.contacts.push(selection) // add more recent contact version
    this.emitter.emit('updated', { incumbent, selection })
  }
}
