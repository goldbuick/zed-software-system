export enum MESSAGE {
  // send a message to target id
  SND_TO,
  // subscribe to a target id
  SUB_TO,
  // send a message to anyone subscribed to your id
  PUB_TO,
}

// can we do a type specialization here to define the payloads?
