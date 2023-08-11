import Case from 'case'

export default function (modules: Record<string, any>) {
  const mapped: Record<string, any> = {}

  function flatten(prefix: string, items: Record<string, any>) {
    Object.keys(items).forEach((item) => {
      if (items[item].__esModule === undefined) {
        flatten(`${prefix}${Case.constant(item)}_`, items[item])
      } else {
        const name = `${prefix}${Case.constant(
          item.replaceAll('.tsx', '').replaceAll('.ts', ''),
        )}`
        mapped[name] = items[item]
      }
    })
  }

  flatten('', modules)

  return mapped
}
