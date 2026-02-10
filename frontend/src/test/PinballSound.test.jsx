import { describe, it, expect, vi } from 'vitest'
import { playFlipperSound, playLifeDownSound, playGameOverSound, playBumperSound } from '../pinballSound'

describe('playFlipperSound', () => {
  it('플리퍼 버튼을 누르면 flipper 사운드의 play()가 호출된다', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = { play: mockPlay, currentTime: 0 }

    playFlipperSound(mockAudio)

    expect(mockPlay).toHaveBeenCalledTimes(1)
  })
})

describe('playLifeDownSound', () => {
  it('life가 줄어들면 lifedown 사운드의 play()가 호출된다', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = { play: mockPlay, currentTime: 0 }

    playLifeDownSound(mockAudio)

    expect(mockPlay).toHaveBeenCalledTimes(1)
  })
})

describe('playGameOverSound', () => {
  it('게임오버가 되면 gameover 사운드의 play()가 호출된다', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = { play: mockPlay, currentTime: 0 }

    playGameOverSound(mockAudio)

    expect(mockPlay).toHaveBeenCalledTimes(1)
  })
})

describe('playBumperSound', () => {
  it('공이 bumper에 맞으면 bumper 사운드의 play()가 호출된다', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = { play: mockPlay, currentTime: 0 }

    playBumperSound(mockAudio)

    expect(mockPlay).toHaveBeenCalledTimes(1)
  })
})
