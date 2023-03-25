import { uniqueNamesGenerator, colors, animals } from 'unique-names-generator'

export default function makeName() {
  return uniqueNamesGenerator({
    dictionaries: [colors, animals],
    separator: ' ',
    length: 2,
    style: 'capital',
  })
}
