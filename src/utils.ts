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
