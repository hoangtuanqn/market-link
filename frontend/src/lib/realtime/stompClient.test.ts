import { afterEach, describe, expect, it, vi } from 'vitest';
import { realtime } from './stompClient';

type Config = { onConnect: () => void; onWebSocketClose: () => void };

const stomp = vi.hoisted(() => ({
  config: null as Config | null,
  connected: false,
  publish: vi.fn(),
}));

vi.mock('@stomp/stompjs', () => ({
  Client: class {
    constructor(config: Config) {
      stomp.config = config;
    }
    get connected() {
      return stomp.connected;
    }
    activate() {}
    deactivate() {
      return Promise.resolve();
    }
    publish = stomp.publish;
    subscribe() {
      return { unsubscribe: () => {} };
    }
  },
}));

vi.mock('@/api-requests/notification.requests', () => ({ default: { unreadCount: vi.fn() } }));
vi.mock('@/utils/session', () => ({ default: { getAccessToken: () => 'token' } }));

/** Simulates one successful connect (or reconnect). */
const connect = () => {
  stomp.connected = true;
  stomp.config?.onConnect();
};

describe('realtime', () => {
  afterEach(() => {
    realtime.stop();
    stomp.connected = false;
    stomp.publish.mockClear();
  });

  /**
   * Review Focus #3: STOMP reconnects on its own but does not replay what was missed during a drop, even when the
   * machine's network never actually went down.
   */
  it('tells listeners every time the socket connects, so they can catch up', () => {
    const listener = vi.fn();
    realtime.onConnect(listener);
    realtime.start();

    connect();
    connect();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops telling a listener once it has left', () => {
    const listener = vi.fn();
    const off = realtime.onConnect(listener);
    realtime.start();

    off();
    connect();

    expect(listener).not.toHaveBeenCalled();
  });

  it('sends a frame as JSON while connected', () => {
    realtime.start();
    connect();

    realtime.publish('/app/typing', { conversationId: 42, typing: true });

    expect(stomp.publish).toHaveBeenCalledWith({
      destination: '/app/typing',
      body: '{"conversationId":42,"typing":true}',
    });
  });

  it('drops a frame while disconnected instead of queueing it', () => {
    realtime.start();

    realtime.publish('/app/typing', { conversationId: 42, typing: true });

    expect(stomp.publish).not.toHaveBeenCalled();
  });
});
