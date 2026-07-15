import { EXCHANGE_ADAPTER } from '../exchange-adapter.interface';

describe('exchange-adapters package', () => {
  it('exposes a stable DI token for the active exchange adapter', () => {
    expect(typeof EXCHANGE_ADAPTER).toBe('symbol');
  });
});
