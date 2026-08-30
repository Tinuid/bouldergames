import { describe, it, expect } from 'vitest'
import { pendingDoneTicks } from './gymTickSync'
import type { Boulder, Result, ResultStatus } from '../types'

function boulder(id: string, seq: number, gymBoulderId: string | null): Boulder {
  return {
    id,
    session_id: 's1',
    seq,
    gym_boulder_id: gymBoulderId,
    difficulty: 4,
    color: 'gruen',
    image_path: null,
    created_by: 'u1',
    created_at: '2026-08-30T10:00:00Z',
  }
}

function result(boulderId: string, status: ResultStatus): Result {
  return {
    id: `r-${boulderId}`,
    session_id: 's1',
    boulder_id: boulderId,
    participant_id: 'p1',
    status,
    attempts: status === 'flash' ? 1 : 2,
    points: 0,
    updated_at: '2026-08-30T10:00:00Z',
  }
}

function resultsFor(entries: [string, ResultStatus][]): Map<string, Result> {
  return new Map(entries.map(([boulderId, status]) => [boulderId, result(boulderId, status)]))
}

describe('pendingDoneTicks', () => {
  it('meldet Flash und Top', () => {
    const boulders = [boulder('b1', 1, 'g1'), boulder('b2', 2, 'g2')]
    const mine = resultsFor([
      ['b1', 'flash'],
      ['b2', 'top'],
    ])
    expect(pendingDoneTicks(boulders, mine, []).sort()).toEqual(['g1', 'g2'])
  })

  it('ignoriert offene und nicht geschaffte Boulder', () => {
    const boulders = [boulder('b1', 1, 'g1'), boulder('b2', 2, 'g2'), boulder('b3', 3, 'g3')]
    const mine = resultsFor([
      ['b1', 'open'],
      ['b2', 'fail'],
    ])
    expect(pendingDoneTicks(boulders, mine, [])).toEqual([])
  })

  it('ignoriert Boulder ohne Karten-Herkunft', () => {
    const boulders = [boulder('b1', 1, null), boulder('b2', 2, 'g2')]
    const mine = resultsFor([
      ['b1', 'top'],
      ['b2', 'top'],
    ])
    expect(pendingDoneTicks(boulders, mine, [])).toEqual(['g2'])
  })

  it('lässt bereits abgeglichene Marken weg', () => {
    const boulders = [boulder('b1', 1, 'g1'), boulder('b2', 2, 'g2')]
    const mine = resultsFor([
      ['b1', 'flash'],
      ['b2', 'top'],
    ])
    expect(pendingDoneTicks(boulders, mine, ['g1'])).toEqual(['g2'])
  })

  it('nennt denselben Karten-Boulder nur einmal', () => {
    // Der partielle Unique-Index verhindert das in einer Session zwar, aber der
    // Aufrufer soll sich auf eine doppelfreie Liste verlassen können.
    const boulders = [boulder('b1', 1, 'g1'), boulder('b2', 2, 'g1')]
    const mine = resultsFor([
      ['b1', 'flash'],
      ['b2', 'top'],
    ])
    expect(pendingDoneTicks(boulders, mine, [])).toEqual(['g1'])
  })

  it('ist ohne eigene Ergebnisse leer', () => {
    const boulders = [boulder('b1', 1, 'g1')]
    expect(pendingDoneTicks(boulders, new Map(), [])).toEqual([])
  })
})
