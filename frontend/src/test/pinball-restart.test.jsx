import { describe, it, expect } from 'vitest'
import { getRestartState } from '../pinballRestart'

describe('getRestartState', () => {
  it('재시작 시 overlayState가 null이 된다', () => {
    const result = getRestartState()
    expect(result.overlayState).toBe(null)
  })

  it('재시작 시 score가 0으로 초기화된다', () => {
    const result = getRestartState()
    expect(result.score).toBe(0)
  })

  it('재시작 시 lives가 3으로 초기화된다', () => {
    const result = getRestartState()
    expect(result.lives).toBe(3)
  })

  it('재시작 시 stage가 1로 초기화된다', () => {
    const result = getRestartState()
    expect(result.stage).toBe(1)
  })
})
