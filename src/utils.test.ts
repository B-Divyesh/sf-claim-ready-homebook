import { describe, expect, it } from 'vitest';
import { csvCell, missingEvidence, readiness, safeFilePart } from './utils';
import type { HomeItem } from './types';

const base: HomeItem = {
  id: '1', name: 'Camera', category: 'Electronics', room: 'Office', container: '', value: 500,
  purchaseDate: '2026-01-01', serial: 'ABC', notes: '', photo: new Blob(['x']),
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
};

describe('inventory helpers', () => {
  it('scores a complete item', () => {
    expect(missingEvidence(base)).toEqual([]);
    expect(readiness([base])).toBe(100);
  });

  it('names each missing evidence field', () => {
    const empty = { ...base, photo: undefined, room: '', value: null, purchaseDate: '', serial: '' };
    expect(missingEvidence(empty)).toEqual(['photo or receipt', 'value', 'purchase date', 'serial/model', 'location']);
    expect(readiness([empty])).toBe(0);
  });

  it('quotes CSV safely and creates safe filenames', () => {
    expect(csvCell('Desk, oak "large"')).toBe('"Desk, oak ""large"""');
    expect(safeFilePart('My Home / 2026')).toBe('my-home-2026');
  });
});
