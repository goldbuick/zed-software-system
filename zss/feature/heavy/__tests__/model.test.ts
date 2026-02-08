import { parsetoolcalls } from 'zss/feature/heavy/model'

describe('parsetoolcalls', () => {
  it('returns empty array for empty string', () => {
    expect(parsetoolcalls('')).toEqual([])
    expect(parsetoolcalls('   ')).toEqual([])
  })

  it('parses call with no args', () => {
    expect(parsetoolcalls('get_agent_name()')).toEqual([
      { name: 'get_agent_name', args: {} },
    ])
    expect(parsetoolcalls('get_agent_board()')).toEqual([
      { name: 'get_agent_board', args: {} },
    ])
  })

  it('parses call with named quoted string args', () => {
    expect(parsetoolcalls('get_current_time(format="iso")')).toEqual([
      { name: 'get_current_time', args: { format: 'iso' } },
    ])
    expect(parsetoolcalls("get_current_time(format='HH:mm')")).toEqual([
      { name: 'get_current_time', args: { format: 'HH:mm' } },
    ])
  })

  it('parses call with named numeric args', () => {
    expect(parsetoolcalls('foo(x=123)')).toEqual([
      { name: 'foo', args: { x: '123' } },
    ])
  })

  it('parses call with named unquoted identifier args', () => {
    expect(parsetoolcalls('foo(x=value)')).toEqual([
      { name: 'foo', args: { x: 'value' } },
    ])
  })

  it('strips optional outer brackets', () => {
    expect(parsetoolcalls('[get_agent_name()]')).toEqual([
      { name: 'get_agent_name', args: {} },
    ])
    expect(parsetoolcalls('[get_current_time(format="iso")]')).toEqual([
      { name: 'get_current_time', args: { format: 'iso' } },
    ])
  })

  it('ignores positional args for unknown tools or tools without required params', () => {
    // get_current_time is not in MODEL_TOOLS; positional args only apply to known tools with required params
    expect(parsetoolcalls('get_current_time("iso")')).toEqual([
      { name: 'get_current_time', args: {} },
    ])
    expect(parsetoolcalls('get_agent_name("extra")')).toEqual([
      { name: 'get_agent_name', args: {} },
    ])
  })

  it('parses multiple calls', () => {
    expect(parsetoolcalls('get_agent_name() get_agent_board()')).toEqual([
      { name: 'get_agent_name', args: {} },
      { name: 'get_agent_board', args: {} },
    ])
    expect(
      parsetoolcalls('get_agent_name() get_current_time(format="iso")'),
    ).toEqual([
      { name: 'get_agent_name', args: {} },
      { name: 'get_current_time', args: { format: 'iso' } },
    ])
  })

  it('handles whitespace around content', () => {
    expect(parsetoolcalls('  get_agent_name()  ')).toEqual([
      { name: 'get_agent_name', args: {} },
    ])
  })

  it('handles extra whitespace inside parentheses', () => {
    expect(parsetoolcalls('get_current_time( format = "iso" )')).toEqual([
      { name: 'get_current_time', args: { format: 'iso' } },
    ])
  })

  it('handles multiple named args', () => {
    expect(parsetoolcalls('foo(a="x", b=42, c=val)')).toEqual([
      { name: 'foo', args: { a: 'x', b: '42', c: 'val' } },
    ])
  })

  it('handles comma in quoted string for named args', () => {
    expect(
      parsetoolcalls('get_current_time(format="YYYY-MM-DD, HH:mm")'),
    ).toEqual([
      { name: 'get_current_time', args: { format: 'YYYY-MM-DD, HH:mm' } },
    ])
  })
})
