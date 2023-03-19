import { render } from '@testing-library/react'

import Gadget from './gadget'

describe('Gadget', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Gadget />)
    expect(baseElement).toBeTruthy()
  })
})
