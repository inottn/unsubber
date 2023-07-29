import unsubber from './index';
import { describe, it, expect, vi } from 'vitest';

const event = unsubber<{
  test: any;
}>();

describe('unsubber', () => {
  it('the type should be a function', () => {
    expect(unsubber).toBeTypeOf('function');
  });

  it('it should return the unsubscribe function', () => {
    const handler = vi.fn();
    const offFn = event.on('test', handler);

    expect(offFn).toBeTypeOf('function');
    expect(event.all.get('test')?.length).toBe(1);

    event.emit('test');
    expect(handler).toBeCalled();

    offFn();
    expect(event.all.get('test')?.length).toBe(0);

    handler.mockReset();
    event.emit('test');
    expect(handler).not.toBeCalled();
  });

  it('unsubscribing after executing the provided method', () => {
    const onUnload = vi.fn();
    const handler = vi.fn();
    const context = {
      onUnload,
      number: 0,
      string: '',
    };

    event.on('test', handler, {
      context,
      methodName: 'onUnload',
    });
    expect(event.all.get('test')?.length).toBe(1);

    event.emit('test');
    expect(handler).toBeCalled();

    context.onUnload();
    expect(event.all.get('test')?.length).toBe(0);

    handler.mockReset();
    event.emit('test');
    expect(handler).not.toBeCalled();
  });

  it('to unsubscribe from group', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();
    const handler4 = vi.fn();

    event.on('test', handler1, {
      groupName: 'group1',
    });
    event.on('test', handler2, {
      groupName: 'group1',
    });

    event.on('test', handler3, {
      groupName: 'group2',
    });
    event.on('test', handler4, {
      groupName: 'group2',
    });

    event.offGroup('group1');
    event.emit('test');
    expect(handler1).not.toBeCalled();
    expect(handler2).not.toBeCalled();
    expect(handler3).toBeCalled();
    expect(handler4).toBeCalled();
  });
});
