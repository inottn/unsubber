import { isFunction } from '@inottn/fp-utils';
import mitt from 'mitt';
import type { EventType, Handler, WildcardHandler } from 'mitt';

type FunctionKeys<T extends object> = {
  [K in keyof T]-?: T[K] extends Function ? K : never;
}[keyof T];
type OffFn = () => void;

export type OnOptions<Context extends object> = Partial<{
  context: Context;
  methodName: FunctionKeys<Context>;
  groupName: EventType;
}>;
export type UnsubberReturnType<Events extends Record<EventType, unknown>> =
  Omit<ReturnType<typeof mitt<Events>>, 'on'> & {
    on<Key extends keyof Events, Context extends object>(
      type: Key,
      handler: Handler<Events[Key]>,
      options?: OnOptions<Context>,
    ): OffFn;
    on<Context extends object>(
      type: '*',
      handler: WildcardHandler<Events>,
      options?: OnOptions<Context>,
    ): OffFn;
    offGroup(groupName: string): void;
  };

function unsubber<Events extends Record<EventType, unknown>>(
  ...args: Parameters<typeof mitt<Events>>
): UnsubberReturnType<Events> {
  type GenericEventHandler =
    | Handler<Events[keyof Events]>
    | WildcardHandler<Events>;
  type MethodMap = Map<string | number | symbol, Set<OffFn>>;

  const events = mitt<Events>(...args);
  const groupEvents = mitt();
  const contextMap = new WeakMap<object, MethodMap>();
  const handlerMap = new WeakMap<GenericEventHandler, OffFn>();

  const getMethodMapAndOffFnSetFromContext = <Context extends object>(
    context: Context,
    methodName: string | number | symbol,
  ) => {
    const methodMap = contextMap.get(context);

    if (!methodMap) return [];

    const offFnSet = methodMap.get(methodName);

    return [methodMap, offFnSet] as const;
  };

  const removeMethodFromContext = <Context extends object>(
    context: Context,
    methodMap: MethodMap,
    methodName: string | number | symbol,
  ) => {
    methodMap.delete(methodName);

    if (methodMap.size === 0) {
      contextMap.delete(context);
    }
  };

  const removeOffFnFromContext = <Context extends object>(
    context: Context,
    methodName: FunctionKeys<Context>,
    offFn: OffFn,
  ) => {
    const [methodMap, offFnSet] = getMethodMapAndOffFnSetFromContext(
      context,
      methodName,
    );

    if (offFnSet) {
      offFnSet.delete(offFn);

      if (offFnSet.size === 0) {
        removeMethodFromContext(context, methodMap, methodName);
      }
    }
  };

  const setOffFnToContextMap = <Context extends object>(
    context: Context,
    methodName: FunctionKeys<Context>,
    offFn: OffFn,
  ) => {
    const [methodMap, offFnSet] = getMethodMapAndOffFnSetFromContext(
      context,
      methodName,
    );

    if (methodMap) {
      if (offFnSet) {
        offFnSet.add(offFn);
      } else {
        methodMap.set(methodName, new Set([offFn]));
      }
    } else {
      contextMap.set(context, new Map([[methodName, new Set([offFn])]]));
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
      const [methodMap, offFnSet] = getMethodMapAndOffFnSetFromContext(
        context,
        methodName,
      );

      if (methodMap && offFnSet) {
        offFnSet.forEach((off) => off());
        removeMethodFromContext(context, methodMap, methodName);
      }

      return returnValue;
    };
  };

  const offGroup = (groupName: string) => {
    groupEvents.emit(groupName);
    groupEvents.off(groupName);
  };

  return Object.assign({}, events, {
    on<Key extends keyof Events, Context extends object>(
      type: Key,
      handler: GenericEventHandler,
      options?: OnOptions<Context>,
    ) {
      const offFnList: OffFn[] = [
        () => events.off(type, handler as Handler<Events[Key]>),
      ];
      const offFn = () => {
        offFnList.forEach((off) => off());
      };
      handlerMap.set(handler, offFn);
      events.on(type, handler as Handler<Events[keyof Events]>);

      if (options) {
        const { context, methodName, groupName } = options;

        if (context && methodName) {
          offFnList.push(() =>
            removeOffFnFromContext(context, methodName, offFn),
          );
          hijackMethod(context, methodName);
          setOffFnToContextMap(context, methodName, offFn);
        }

        if (groupName) {
          offFnList.push(() => groupEvents.off(groupName, offFn));
          groupEvents.on(groupName, offFn);
        }
      }

      return offFn;
    },

    offGroup,
  });
}

export default unsubber;
