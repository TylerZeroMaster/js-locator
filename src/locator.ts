import { Page } from './page';
import {
  ByRoleOptions,
  ElementHandleClickOptions,
  LocatorOptions,
  ModifierKeys,
} from './types';
import { filter, map, waitFor } from './utils';
import { createTextMatcher } from './utils';
import { assertValue } from './utils';

const logger = console;

function filterSelector(elements: Iterable<Element>, options: LocatorOptions) {
  let filtered = elements;
  if (options.hasText !== undefined) {
    filtered = filter(
      filtered,
      createTextMatcher(options.hasText, (el: Element) => el.textContent),
    );
  }
  if (options.hasNotText !== undefined) {
    const textMatcher = createTextMatcher(
      options.hasNotText,
      (el: Element) => el.textContent,
    );
    filtered = filter(filtered, (el) => !textMatcher(el));
  }
  if (options.has !== undefined) {
    const testLocator = options.has;
    filtered = filter(
      filtered,
      (el) => testLocator.withRoot(el).collectSync().length > 0,
    );
  }
  if (options.hasNot !== undefined) {
    const testLocator = options.hasNot;
    filtered = filter(
      filtered,
      (el) => testLocator.withRoot(el).collectSync().length === 0,
    );
  }
  return filtered;
}

function getByTextSelector(
  elements: Iterable<Element>,
  text: string | RegExp,
  options?: { exact?: boolean },
) {
  return filter(
    elements,
    createTextMatcher(text, (el: Element) => el.textContent, options),
  );
}

function getByRoleSelector(
  elements: Iterable<Element>,
  role: string | RegExp,
  options: ByRoleOptions,
) {
  const isUndefinedOrEqual = <T>(option: T | undefined, value: T) =>
    option === undefined || option === value;
  const roleMatcher = createTextMatcher(
    role,
    // According to https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles
    // inputs should get their type as a role by default, but this does not seem to actually happen...
    (el: Element) => el.getAttribute('role') ?? el.getAttribute('type'),
    options,
  );
  return filter(elements, (el) => {
    const input = el as HTMLInputElement;
    return (
      roleMatcher(input) &&
      isUndefinedOrEqual(options.name, input.name) &&
      isUndefinedOrEqual(options.checked, input.checked) &&
      isUndefinedOrEqual(options.disabled, input.disabled) &&
      isUndefinedOrEqual(
        options.selected && String(options.selected),
        input.ariaSelected,
      ) &&
      isUndefinedOrEqual(
        options.expanded && String(options.expanded),
        input.ariaExpanded,
      ) &&
      isUndefinedOrEqual(
        options.level && String(options.level),
        input.ariaLevel,
      ) &&
      isUndefinedOrEqual(
        options.pressed && String(options.pressed),
        input.ariaPressed,
      )
    );
  });
}

function* mapSelector(elements: Iterable<Element>, selector: string) {
  for (const el of elements) {
    if (el.matches(selector)) {
      yield el;
    }
    for (const child of el.querySelectorAll(selector)) {
      yield child;
    }
  }
}

function mouseEventFromClickOptions(
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

function mouseEventFromClickOptionsWithPosition(
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

export class Locator {
  constructor(
    private readonly page: Page,
    private readonly selector: string | (() => Iterable<Element>),
    private readonly root: Document | Element = page.document,
  ) {}

  withRoot(root: Document | Element) {
    return new Locator(this.page, this.selector, root);
  }

  private get valueRaw(): Iterable<Element> {
    if (typeof this.selector === 'string') {
      return this.root.querySelectorAll(this.selector);
    } else {
      return this.selector();
    }
  }

  unwrapSync(): Element | undefined {
    return this.collectSync()[0];
  }

  collectSync(): Element[] {
    return Array.from(this.valueRaw);
  }

  async collect(options?: { timeout?: number }): Promise<Element[]> {
    if (options?.timeout === undefined) {
      return this.collectSync();
    } else {
      const result = this.collectSync();
      return result.length !== 0
        ? result
        : waitFor(
            this.root,
            (resolve) => () => {
              const result = this.collectSync();
              if (result.length !== 0) {
                resolve(result);
              }
            },
            options.timeout,
          );
    }
  }

  async unwrap(options?: { timeout?: number }): Promise<Element | undefined> {
    return (await this.collect(options))[0];
  }

  locator(
    selectorOrFunc: string | (() => Iterable<Element>),
    root: Document | Element = this.page.document,
  ): Locator {
    return new Locator(
      this.page,
      typeof selectorOrFunc === 'string'
        ? () => mapSelector(this.valueRaw, selectorOrFunc)
        : selectorOrFunc,
      root,
    );
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator(() => getByTextSelector(this.valueRaw, text, options));
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator(() =>
      map(
        filter(
          this.locator('label').valueRaw,
          createTextMatcher(text, (el) => el.textContent, options),
        ),
        (el: HTMLLabelElement) =>
          assertValue(this.page.document.getElementById(el.htmlFor)),
      ),
    );
  }

  getByRole(role: string, options: ByRoleOptions = {}): Locator {
    return this.locator(() => getByRoleSelector(this.valueRaw, role, options));
  }

  filter(options: LocatorOptions) {
    return this.locator(() => filterSelector(this.valueRaw, options));
  }

  first() {
    return this.nth(0);
  }

  last() {
    return this.nth(-1);
  }

  nth(index: number) {
    return new Locator(this.page, () => {
      const results = this.collectSync();
      if (index < 0) index = results.length + index;
      return results.slice(index, index + 1);
    });
  }

  parentElement() {
    return this.locator(() => {
      const parent = this.unwrapSync()?.parentElement;
      return parent != null ? [parent] : [];
    });
  }

  async doActionByTagName<T>(
    actions: Record<string, (el: Element) => T> &
      Record<'default', (el: Element) => T>,
    options?: { timeout?: number },
  ) {
    const element = assertValue(await this.unwrap(options));
    const action =
      actions[element.tagName.toLocaleLowerCase()] ?? actions.default;
    await this.page.slowdown();
    return action(element);
  }

  async fill(text: string, options?: { timeout?: number }) {
    await this.doActionByTagName(
      {
        input: (el) => ((el as HTMLInputElement).value = text),
        default: (el) => (assertValue(el.querySelector('input')).value = text),
      },
      options,
    );
  }

  async check(value: boolean = true, options?: { timeout?: number }) {
    await this.doActionByTagName(
      {
        input: (el) => ((el as HTMLInputElement).checked = value),
        default: (el) =>
          (assertValue(el.querySelector('input')).checked = true),
      },
      options,
    );
  }

  async focus(options?: { timeout?: number }) {
    await this.doActionByTagName(
      {
        default: (el) => {
          el.dispatchEvent(
            new FocusEvent('focus', {
              view: window,
              bubbles: true,
              cancelable: true,
            }),
          );
        },
      },
      options,
    );
  }

  async uncheck(options?: { timeout?: number }) {
    await this.check(false, options);
  }

  async click(options?: ElementHandleClickOptions) {
    await this.doActionByTagName(
      {
        default: (el) =>
          el.dispatchEvent(
            new MouseEvent(
              'click',
              mouseEventFromClickOptionsWithPosition(el, options),
            ),
          ),
      },
      options,
    );
  }

  async dblclick(options?: { timeout?: number }) {
    await this.doActionByTagName(
      {
        default: (el) =>
          el.dispatchEvent(
            new MouseEvent(
              'dblclick',
              mouseEventFromClickOptionsWithPosition(el, options),
            ),
          ),
      },
      options,
    );
  }
}
