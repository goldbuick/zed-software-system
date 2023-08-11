import * as THREE from 'three'

/* https://androidarts.com/palette/16pal.htm
  '#000000', // 0 void
  '#9D9D9D', // 1 gray
  '#FFFFFF', // 2 white
  '#BE2633', // 3 red
  '#E06F8B', // 4 meat
  '#493C2B', // 5 dark brown
  '#A46422', // 6 brown
  '#EB8931', // 7 orange
  '#F7E26B', // 8 yellow
  '#2F484E', // 9 dark green
  '#44891A', // 10 green
  '#A3CE27', // 11 slime green
  '#1B2632', // 12 night blue
  '#005784', // 13 sea blue
  '#31A2F2', // 14 sky blue
  '#B2DCEF', // 15 cloud blue
*/

const baseColors = [
  '#000000', // BLACK
  '#AAD0FF', // SKYBLUE
  '#00B6F2', // BLUE
  '#44891A', // GREEN
  '#A3CE27', // LIME
  '#15F0A3', // TEAL
  '#EC4700', // ORANGE
  '#BE2633', // RED
  '#E06F8B', // PINK
  '#9964F9', // PURPLE
  '#A46422', // BROWN
  '#EB8931', // PUMPKIN
  '#F4B990', // TAUPE
  '#F7E26B', // YELLOW
  '#606060', // GREY // 50
  '#FFFFFF', // WHITE // 100
]

const colorNames = [
  'BLACK',
  'SKYBLUE',
  'BLUE',
  'GREEN',
  'LIME',
  'TEAL',
  'ORANGE',
  'RED',
  'PINK',
  'PURPLE',
  'BROWN',
  'PUMPKIN',
  'TAUPE',
  'YELLOW',
  'GREY',
  'WHITE',
]

const dimColorNames = colorNames.map((name) => `DARK_${name}`)
dimColorNames[0] = 'MAGENTA'
dimColorNames[15] = 'LIGHT_GREY'

export const allColorNames = [...colorNames, ...dimColorNames]

const dimColors = [
  '#FF00FF', // MAGENTA
  '#22303F', // SKYBLUE
  '#152663', // BLUE
  '#0D1B05', // GREEN
  '#202907', // LIME
  '#06442D', // TEAL
  '#601D00', // ORANGE
  '#26070A', // RED
  '#370B16', // PINK
  '#312151', // PURPLE
  '#201306', // BROWN
  '#331B05', // PUMPKIN
  '#493C2B', // TAUPE
  '#433903', // YELLOW
  '#101010', // DARK_GREY // 25
  '#bfbfbf', // LIGHT_GREY // 75
]

const colors = [baseColors, dimColors].flat()
export const threeColors: THREE.Color[] = colors.map(
  (color) => new THREE.Color(color),
)

export enum COLOR {
  BLACK,
  SKYBLUE,
  BLUE,
  GREEN,
  LIME,
  TEAL,
  ORANGE,
  RED,
  PINK,
  PURPLE,
  BROWN,
  PUMPKIN,
  TAUPE,
  YELLOW,
  GREY,
  WHITE,
  MAGENTA,
  DARK_SKYBLUE,
  DARK_BLUE,
  DARK_GREEN,
  DARK_LIME,
  DARK_TEAL,
  DARK_ORANGE,
  DARK_RED,
  DARK_PINK,
  DARK_PURPLE,
  DARK_BROWN,
  DARK_PUMPKIN,
  DARK_TAUPE,
  DARK_YELLOW,
  DARK_GREY,
  LIGHT_GREY,
  MAX,
}

export function getColor(color: COLOR) {
  return colors[color] ?? colors[16]
}

export function getThreeColor(color: COLOR) {
  return threeColors[color] ?? threeColors[16]
}

export function getColorName(color: COLOR) {
  return allColorNames[color] || ''
}
