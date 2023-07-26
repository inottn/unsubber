import { noop } from '@inottn/fp-utils';
import unsubber from './index';
import { describe, it, expect, vi } from 'vitest';

const event = unsubber<{
  test: {};
}>();

describe('unsubber', () => {
  it('the type should be a function', () => {
    expect(unsubber).toBeTypeOf('function');
  });

  it('it should return the unsubscribe function', () => {
    const offFn = event.on('test', noop);

    expect(offFn).toBeTypeOf('function');
    expect(event.all.get('test')?.length).toBe(1);

    offFn();
    expect(event.all.get('test')?.length).toBe(0);
  });

  it('unsubscribing after executing the provided method', () => {
    const onUnload = vi.fn();
    const handler = vi.fn();
    const context = {
      onUnload,
      number: 0,
      string: '',
    };

    event.on('test', handler, context, 'onUnload');
    expect(event.all.get('test')?.length).toBe(1);

    context.onUnload();
    expect(event.all.get('test')?.length).toBe(0);
  });
});
