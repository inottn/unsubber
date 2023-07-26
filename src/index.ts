import { isFunction } from '@inottn/fp-utils';
import mitt from 'mitt';
import type { EventType, Handler, WildcardHandler } from 'mitt';

type FunctionKeys<T extends object> = {
  [K in keyof T]-?: T[K] extends Function ? K : never;
}[keyof T];
type OffFn = () => void;
export type EmitterReturnType<Events extends Record<EventType, unknown>> = Omit<
  ReturnType<typeof mitt<Events>>,
  'on'
> & {
  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): OffFn;
  on<Key extends keyof Events, Context extends object>(
    type: Key,
    handler: Handler<Events[Key]>,
    context: Context,
    methodName: FunctionKeys<Context>,
  ): OffFn;
  on(type: '*', handler: WildcardHandler<Events>): OffFn;
  on<Context extends object>(
    type: '*',
    handler: WildcardHandler<Events>,
    context: Context,
    methodName: FunctionKeys<Context>,
  ): OffFn;
};

function unsubber<Events extends Record<EventType, unknown>>(
  ...args: Parameters<typeof mitt<Events>>
): EmitterReturnType<Events> {
  type GenericEventHandler =
    | Handler<Events[keyof Events]>
    | WildcardHandler<Events>;

  const event = mitt<Events>(...args);
  const contextMap = new Map<object, Map<string | number | symbol, OffFn[]>>();

  const setOffFnToContextMap = <Context extends object>(
    context: Context,
    methodName: FunctionKeys<Context>,
    offFn: OffFn,
  ) => {
    const methodMap = contextMap.get(context);

    if (methodMap) {
      const offFnList = methodMap.get(methodName);

      if (offFnList) {
        offFnList.push(offFn);
      } else {
        methodMap.set(methodName, [offFn]);
      }
    } else {
      contextMap.set(context, new Map([[methodName, [offFn]]]));
    }
  };

  const hijackMethod = <Context extends object>(
    context: Context,
    methodName: FunctionKeys<Context>,
  ) => {
    if (contextMap.get(context)?.has(methodName)) return;

    const origin = context[methodName];

    (context[methodName] as Function) = function (
      this: Context,
      ...args: unknown[]
    ) {
      const returnValue = isFunction(origin)
        ? (origin as Function).apply(this, args)
        : undefined;
      const methodMap = contextMap.get(context);

      if (!methodMap) return returnValue;

      const handlers = methodMap.get(methodName);

      if (handlers) {
        handlers.forEach((handler) => handler());
        methodMap.delete(methodName);

        if (methodMap.size === 0) {
          contextMap.delete(context);
        }
      }

      return returnValue;
    };
  };

  return Object.assign({}, event, {
    on<Key extends keyof Events, Context extends object>(
      type: Key,
      handler: GenericEventHandler,
      context?: Context,
      methodName?: FunctionKeys<Context>,
    ) {
      event.on(type, handler as Handler<Events[keyof Events]>);
      const offFn = () => event.off(type, handler as Handler<Events[Key]>);

      if (context && methodName) {
        hijackMethod(context, methodName);
        setOffFnToContextMap(context, methodName, offFn);
      }

      return offFn;
    },
  });
}

export default unsubber;
