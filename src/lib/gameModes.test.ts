import { describe, it, expect } from 'vitest'
import {
  GAME_MODES,
  UPCOMING_EXTRAS,
  UPCOMING_FORMS,
  UPCOMING_MODES,
  gameModeInfo,
  isDefaultGameMode,
  isGameMode,
} from './gameModes'

describe('Modus-Katalog', () => {
  it('Standard zählt Top und Fehlversuche, Nur Flash nicht', () => {
    expect(gameModeInfo('standard')).toMatchObject({ scoresTop: true, usesMisses: true })
    expect(gameModeInfo('flash_only')).toMatchObject({ scoresTop: false, usesMisses: false })
  })

  it('Nur Flash hat genau einen Versuch pro Boulder, Standard nicht', () => {
    expect(gameModeInfo('standard').singleAttempt).toBe(false)
    expect(gameModeInfo('flash_only').singleAttempt).toBe(true)
  })

  it('unbekannte oder fehlende Werte fallen auf Standard zurück', () => {
    expect(gameModeInfo(undefined).value).toBe('standard')
    expect(isDefaultGameMode(undefined)).toBe(true)
    expect(isDefaultGameMode('flash_only')).toBe(false)
  })

  it('nur gebaute Modi sind wählbar', () => {
    expect(isGameMode('flash_only')).toBe(true)
    expect(isGameMode('time_attack')).toBe(false)
  })

  it('Extras sind nie vorbelegt – auch das Zeitlimit nicht', () => {
    expect(UPCOMING_EXTRAS.every((e) => e.defaultOn === false)).toBe(true)
    expect(UPCOMING_EXTRAS.some((e) => e.key === 'time_attack')).toBe(true)
  })

  it('kein Schlüssel kommt doppelt vor', () => {
    const keys = [
      ...GAME_MODES.map((m) => m.value as string),
      ...UPCOMING_MODES.map((m) => m.key),
      ...UPCOMING_FORMS.map((m) => m.key),
      ...UPCOMING_EXTRAS.map((m) => m.key),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })
})
