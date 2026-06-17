/**
 * Testes unitários das funções puras de preço, semáforo, XP e economia.
 * Rode com: npm test  (na pasta apps/web)
 */
import { describe, expect, it } from 'vitest';
import {
  averagePrice,
  categorizePrice,
  computePriceThresholds,
  estimateSavings,
  formatFuelPrice,
  isPriceWithinRange,
  levelFromXp,
  levelProgress,
  xpToNextLevel,
} from '@abastece/utils/price';

describe('formatFuelPrice', () => {
  it('formata com 3 casas e vírgula', () => {
    expect(formatFuelPrice(5.89)).toBe('R$ 5,890');
  });
  it('trata valor ausente', () => {
    expect(formatFuelPrice(null)).toBe('—');
  });
});

describe('computePriceThresholds + categorizePrice', () => {
  const prices = [5.79, 5.89, 5.99, 6.09, 6.19];
  const thresholds = computePriceThresholds(prices);

  it('classifica o mais barato como cheap', () => {
    expect(categorizePrice(5.79, thresholds)).toBe('cheap');
  });
  it('classifica o mais caro como expensive', () => {
    expect(categorizePrice(6.19, thresholds)).toBe('expensive');
  });
  it('classifica o do meio como mid', () => {
    expect(categorizePrice(5.99, thresholds)).toBe('mid');
  });
  it('retorna unknown sem preço', () => {
    expect(categorizePrice(null, thresholds)).toBe('unknown');
  });
});

describe('averagePrice', () => {
  it('calcula a média ignorando inválidos', () => {
    expect(averagePrice([5, 7, 0, -1])).toBe(6);
  });
  it('retorna null para lista vazia', () => {
    expect(averagePrice([])).toBeNull();
  });
});

describe('isPriceWithinRange', () => {
  it('aceita preço dentro de ±30%', () => {
    expect(isPriceWithinRange(6, 5.5)).toBe(true);
  });
  it('rejeita preço muito acima', () => {
    expect(isPriceWithinRange(10, 5)).toBe(false);
  });
  it('aceita qualquer preço sem histórico', () => {
    expect(isPriceWithinRange(99, null)).toBe(true);
  });
});

describe('níveis de XP', () => {
  it('XP 0 é nível 1', () => {
    expect(levelFromXp(0).level).toBe(1);
  });
  it('XP 350 é nível 3 (Colaborador)', () => {
    expect(levelFromXp(350).name).toBe('Colaborador');
  });
  it('XP alto é nível máximo', () => {
    expect(levelFromXp(5000).level).toBe(5);
  });
  it('progresso fica entre 0 e 100', () => {
    const p = levelProgress(200);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
  it('nível máximo não tem XP restante', () => {
    expect(xpToNextLevel(5000)).toBeNull();
  });
});

describe('estimateSavings', () => {
  it('calcula economia ao abastecer abaixo da média', () => {
    // média 6,00; pagou 5,80; 40 litros => 0,20 * 40 = 8,00
    expect(estimateSavings(5.8, 6.0, 40)).toBeCloseTo(8, 5);
  });
  it('retorna 0 ao abastecer acima da média', () => {
    expect(estimateSavings(6.2, 6.0, 40)).toBe(0);
  });
});
