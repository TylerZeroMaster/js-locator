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
  const observer = new MutationObserver((mutations, ob) => {
    const result = callback(mutations, ob);
    if (result) disconnect();
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
    reject: (reason?: any) => void,
  ) => (mutations: MutationRecord[], observer: MutationObserver) => void,
  timeout: number,
  options?: MutationObserverInit,
): Promise<T> {
  return new Promise(function (oresolve, oreject) {
    let timeoutId: NodeJS.Timeout;
    let disconnect: () => void;
    const resolve = (value: T) => {
      clearTimeout(timeoutId);
      disconnect();
      oresolve(value);
    };
    const reject = (reason?: any) => {
      disconnect();
      oreject(reason);
    };
    disconnect = observe(node, callbackFactory(resolve, reject), options);
    timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout);
  });
}
