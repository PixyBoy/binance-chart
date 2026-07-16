import { Test, TestingModule } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import { OrderbookGateway } from './orderbook.gateway';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { OrderbookFormatterService } from './orderbook-formatter.service';
import { obChannel } from '../ingestion/orderbook-publisher.service';

function fakeSocket(id: string): Socket {
  return {
    id,
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  } as unknown as Socket;
}

describe('OrderbookGateway', () => {
  let gateway: OrderbookGateway;
  let redisSubMock: {
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
    on: jest.Mock;
  };
  let redisMock: { duplicate: jest.Mock };
  let formatterMock: OrderbookFormatterService;
  let fakeServer: { to: jest.Mock; emit: jest.Mock };

  beforeEach(async () => {
    redisSubMock = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };
    redisMock = { duplicate: jest.fn(() => redisSubMock) };
    formatterMock = {
      format: jest.fn().mockReturnValue({
        symbol: 'BTCUSDT',
        timestamp: Date.now(),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderbookGateway,
        { provide: REDIS_CLIENT, useValue: redisMock },
        { provide: OrderbookFormatterService, useValue: formatterMock },
      ],
    }).compile();

    gateway = module.get<OrderbookGateway>(OrderbookGateway);

    fakeServer = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    gateway.server = fakeServer as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('subscribes to Redis channel only on first client', async () => {
    const a = fakeSocket('a');
    const b = fakeSocket('b');

    await gateway.handleSubscribe(a, { symbol: 'BTCUSDT', marketType: 'spot' });
    await gateway.handleSubscribe(b, { symbol: 'BTCUSDT', marketType: 'spot' });

    expect(redisSubMock.subscribe).toHaveBeenCalledTimes(1);
    expect(redisSubMock.subscribe).toHaveBeenCalledWith(
      obChannel('binance', 'spot', 'BTCUSDT'),
    );
  });

  it('unsubscribes only when last client leaves', async () => {
    const a = fakeSocket('a');
    const b = fakeSocket('b');

    await gateway.handleSubscribe(a, { symbol: 'BTCUSDT', marketType: 'spot' });
    await gateway.handleSubscribe(b, { symbol: 'BTCUSDT', marketType: 'spot' });

    await gateway.handleUnsubscribe(a, { symbol: 'BTCUSDT', marketType: 'spot' });
    expect(redisSubMock.unsubscribe).not.toHaveBeenCalled();

    await gateway.handleUnsubscribe(b, { symbol: 'BTCUSDT', marketType: 'spot' });
    expect(redisSubMock.unsubscribe).toHaveBeenCalledWith(
      obChannel('binance', 'spot', 'BTCUSDT'),
    );
  });

  it('cleans up on disconnect', async () => {
    const a = fakeSocket('a');
    await gateway.handleSubscribe(a, { symbol: 'ETHUSDT', marketType: 'spot' });

    await gateway.handleDisconnect(a);

    expect(redisSubMock.unsubscribe).toHaveBeenCalledWith(
      obChannel('binance', 'spot', 'ETHUSDT'),
    );
  });
});
