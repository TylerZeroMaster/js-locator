export function assertValue<T>(
  value: T | undefined | null,
  message: string = 'Expected value, got nothing',
) {
  if (value != null) return value;
  /* istanbul ignore next */
  throw new Error(message);
}
export function createTextMatcher(
  text: string | RegExp,
  key: (el: Element) => string | undefined | null,
  options?: { exact?: boolean },
) {
  if (options?.exact === true) {
    return (el) => key(el) === text;
  } else {
    const pattern = typeof text === 'string' ? new RegExp(text) : text;
    return (el) => {
      const value = key(el);
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
