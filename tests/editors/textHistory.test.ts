import { afterEach, describe, expect, it } from 'vitest'
import {
  _resetHistoryStore,
  forgetHistory,
  historyFor,
  planMove,
  pushEdit,
} from '../../src/editors/textHistory'

function apply(
  from: string[],
  to: string[],
  cur: string,
): string | undefined {
  const plan = planMove(from, to, cur)
  if (!plan) return undefined
  plan.commit()
  return plan.next
}

describe('textHistory', () => {
  afterEach(() => _resetHistoryStore())

  it('historyFor persists stacks across lookups', () => {
    const a = historyFor('file://x', 'v1')
    pushEdit(a.undo, a.redo, 'v1')
    a.tip = 'v2'
    const b = historyFor('file://x', 'v2')
    expect(b.undo).toBe(a.undo)
    expect(b.undo).toEqual(['v1'])
  })

  it('historyFor wipes when tip mismatches current text', () => {
    const a = historyFor('file://y', 'v1')
    pushEdit(a.undo, a.redo, 'v1')
    a.tip = 'v2'
    const b = historyFor('file://y', 'v3')
    expect(b.undo).toEqual([])
    expect(b.tip).toBe('v3')
  })

  it('forgetHistory drops entry', () => {
    historyFor('file://z', 'a')
    forgetHistory('file://z')
    const h = historyFor('file://z', 'a')
    expect(h.undo).toEqual([])
  })

  it('undo/redo round-trip', () => {
    const undo: string[] = []
    const redo: string[] = []
    let cur = 'a'
    pushEdit(undo, redo, cur)
    cur = 'b'
    pushEdit(undo, redo, cur)
    cur = 'c'

    cur = apply(undo, redo, cur)!
    expect(cur).toBe('b')
    cur = apply(undo, redo, cur)!
    expect(cur).toBe('a')
    cur = apply(redo, undo, cur)!
    expect(cur).toBe('b')
    expect(apply(redo, undo, cur)).toBe('c')
  })

  it('new edit clears redo', () => {
    const undo: string[] = []
    const redo: string[] = []
    pushEdit(undo, redo, 'a')
    const cur = apply(undo, redo, 'b')!
    expect(redo).toEqual(['b'])
    pushEdit(undo, redo, cur)
    expect(redo).toEqual([])
  })

  it('empty undo/redo are hard no-ops', () => {
    const undo: string[] = []
    const redo: string[] = []
    expect(apply(undo, redo, 'x')).toBeUndefined()
    expect(apply(redo, undo, 'x')).toBeUndefined()
    expect(undo).toEqual([])
    expect(redo).toEqual([])
  })

  it('planMove commits only when caller says so', () => {
    const undo = ['a']
    const redo: string[] = []
    const plan = planMove(undo, redo, 'b')
    expect(plan?.next).toBe('a')
    expect(undo).toEqual(['a'])
    plan!.commit()
    expect(undo).toEqual([])
    expect(redo).toEqual(['b'])
    expect(planMove(redo, undo, 'a')?.next).toBe('b')
  })
})
