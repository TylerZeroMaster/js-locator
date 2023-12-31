import { ElementHandleClickOptions, ModifierKeys } from './types';

const logger = console;

export function assertValue<T>(
  value: T | undefined | null,
  message: string = 'Expected value, got nothing',
) {
  if (value != null) return value;
  /* istanbul ignore next */
  throw new Error(message);
}

export function createTextMatcher<T>(
  text: string | RegExp,
  key: (thing: T) => string | undefined | null,
  options?: { exact?: boolean },
) {
  if (options?.exact === true) {
    return (thing: T) => key(thing) === text;
  } else {
    const pattern = typeof text === 'string' ? new RegExp(text) : text;
    return (thing: T) => {
      const value = key(thing);
      return value != null && pattern.test(value);
    };
  }
}

export function* map<T, R>(it: Iterable<T>, cb: (x: T) => R) {
  for (const x of it) {
    yield cb(x);
  }
}

export function* filter<T>(it: Iterable<T>, condition: (x: T) => boolean) {
  for (const x of it) {
    if (condition(x)) {
      yield x;
    }
  }
}

export function observe(
  node: Node,
  callback: (
    mutations: MutationRecord[],
    observer: MutationObserver,
  ) => boolean | void,
  options?: MutationObserverInit,
): () => void {
  const observer = new MutationObserver((mutations, obs) => {
    if (callback(mutations, obs) === true) disconnect();
  });
  observer.observe(node, {
    childList: true,
    subtree: true,
    ...options,
  });
  const disconnect = () => observer.disconnect();
  return disconnect;
}

export async function waitFor<T>(
  node: Node,
  callbackFactory: (
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
  ) => (mutations: MutationRecord[], obs: MutationObserver) => void,
  timeout: number,
  options?: MutationObserverInit,
): Promise<T> {
  return new Promise(function (oresolve, oreject) {
    const resolve = (value: T) => {
      clearTimeout(timeoutId);
      disconnect();
      oresolve(value);
    };
    const reject = (reason?: unknown) => {
      disconnect();
      oreject(reason);
    };
    const disconnect = observe(node, callbackFactory(resolve, reject), options);
    const timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout);
  });
}

export function* iterTree(document: Document, root?: Node) {
  const walker = document.createTreeWalker(
    root ?? document.body,
    NodeFilter.SHOW_ELEMENT,
  );
  let node: Node | null;
  while ((node = walker.nextNode()) != null) yield node as Element;
}

export function mouseEventFromClickOptions(
  options?: ElementHandleClickOptions,
): MouseEventInit {
  const modifiers: Partial<Record<ModifierKeys, boolean>> = {};
  options?.modifiers?.forEach((mod) => (modifiers[mod] = true));
  const buttonsByName = {
    left: 0,
    right: 2,
    middle: 1,
  };
  /* istanbul ignore next */
  if (options?.force !== undefined) {
    logger.warn('force option not supported');
  }
  return {
    view: window,
    bubbles: true,
    cancelable: true,
    altKey: !!modifiers.Alt,
    ctrlKey: !!modifiers.Control,
    metaKey: !!modifiers.Meta,
    shiftKey: !!modifiers.Shift,
    button: buttonsByName[options?.button ?? 'left'],
    clientX: 0,
    clientY: 0,
    detail: options?.clickCount ?? 1,
  };
}

export function mouseEventFromClickOptionsWithPosition(
  el: Element,
  options?: ElementHandleClickOptions,
): MouseEventInit {
  const box = el.getBoundingClientRect();
  return {
    ...mouseEventFromClickOptions(options),
    clientX: box.x + (options?.position?.x ?? 0),
    clientY: box.y + (options?.position?.y ?? 0),
  };
}
