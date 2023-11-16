export type ByRoleOptions = {
  checked?: boolean;
  disabled?: boolean;
  exact?: boolean;
  expanded?: boolean;
  includeHidden?: boolean;
  level?: number;
  name?: string | RegExp;
  pressed?: boolean;
  selected?: boolean;
};

export type LocatorOptions = {
  hasText?: string | RegExp;
  hasNotText?: string | RegExp;
  has?: Locator;
  hasNot?: Locator;
};

export type PageOptions = {
  slowmo?: number;
};

function assertValue<T>(
  value: T | undefined | null,
  message: string = 'Expected value, got nothing',
) {
  if (value != null) return value;
  throw new Error(message);
}

function filterSelector(elements: Iterable<Element>, options: LocatorOptions) {
  let filtered = elements;
  if (options.hasText !== undefined) {
    filtered = filter(
      filtered,
      createTextMatcher(options.hasText, (el) => el.textContent),
    );
  }
  if (options.hasNotText !== undefined) {
    const textMatcher = createTextMatcher(
      options.hasNotText,
      (el) => el.textContent,
    );
    filtered = filter(filtered, (el) => !textMatcher(el));
  }
  if (options.has !== undefined) {
    const testLocator = options.has;
    filtered = filter(
      filtered,
      (el) => testLocator.withRoot(el).collect().length > 0,
    );
  }
  if (options.hasNot !== undefined) {
    const testLocator = options.hasNot;
    filtered = filter(
      filtered,
      (el) => testLocator.withRoot(el).collect().length === 0,
    );
  }
  return filtered;
}

function createTextMatcher(
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

function* filter<T>(it: Iterable<T>, condition: (x: T) => boolean) {
  for (const x of it) {
    if (condition(x)) {
      yield x;
    }
  }
}

function getByTextSelector(
  elements: Iterable<Element>,
  text: string | RegExp,
  options?: { exact?: boolean },
) {
  return filter(
    elements,
    createTextMatcher(text, (el) => el.textContent, options),
  );
}

function getByTagNameSelector(
  elements: Iterable<Element>,
  tagName: string | RegExp,
  options?: { exact?: boolean },
) {
  return filter(
    elements,
    createTextMatcher(tagName, (el) => el.tagName.toLocaleLowerCase(), options),
  );
}

function getByLabelSelector(
  elements: Iterable<Element>,
  text: string | RegExp,
  options?: { exact?: boolean },
) {
  return getByTextSelector(
    getByTagNameSelector(elements, 'label'),
    text,
    options,
  );
}

function getByRoleSelector(
  elements: Iterable<Element>,
  role: string | RegExp,
  options: ByRoleOptions,
) {
  const isUndefinedOrEqual = <T>(option: T | undefined, value: T) =>
    option === undefined || option === value;
  const roleMatcher = createTextMatcher(role, (el) => el.role, options);
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
    for (const child of el.querySelectorAll(selector)) {
      yield child;
    }
  }
}

class Page {
  public readonly slowdown: () => Promise<void>;

  constructor(
    private readonly options: PageOptions,
    public readonly document = window.document,
  ) {
    this.slowdown =
      options.slowmo !== undefined
        ? () => new Promise((res, rej) => setTimeout(res, options.slowmo))
        : () => Promise.resolve();
  }

  locator(selector: string) {
    return new Locator(this, selector);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator('*').getByText(text, options);
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator('label').getByText(text, options);
  }

  getByRole(role: string, options: ByRoleOptions = {}): Locator {
    return this.locator('*').getByRole(role, options);
  }
}

class Locator {
  constructor(
    private readonly page: Page,
    private readonly selector: string | Iterable<Element>,
    private readonly options?: LocatorOptions,
    private readonly root: Document | Element = page.document,
  ) {}

  withRoot(root: Document | Element) {
    return new Locator(this.page, this.selector, this.options, root);
  }

  private get valueRaw(): Iterable<Element> {
    if (typeof this.selector === 'string') {
      return this.root.querySelectorAll(this.selector);
    } else {
      return this.selector;
    }
  }

  unwrap(): Element | undefined {
    return this.collect()[0];
  }

  collect(): Element[] {
    return Array.from(this.valueRaw);
  }

  locator(
    selectorOrIterable: string | Iterable<Element>,
    options?: LocatorOptions,
    root: Document | Element = this.page.document,
  ): Locator {
    return new Locator(
      this.page,
      typeof selectorOrIterable === 'string'
        ? mapSelector(this.valueRaw, selectorOrIterable)
        : selectorOrIterable,
      options,
      root,
    );
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator(getByTextSelector(this.valueRaw, text, options));
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator(getByLabelSelector(this.valueRaw, text, options));
  }

  getByRole(role: string, options: ByRoleOptions = {}): Locator {
    return this.locator(getByRoleSelector(this.valueRaw, role, options));
  }

  filter(options: LocatorOptions) {
    return this.locator(filterSelector(this.valueRaw, options));
  }

  first() {
    return this.nth(0);
  }

  last() {
    return this.nth(-1);
  }

  nth(index: number) {
    const results = this.collect();
    return new Locator(
      this.page,
      (function* () {
        yield results[index < 0 ? results.length + index : index];
      })(),
    );
  }

  async doActionByTagName<T>(
    actions: Record<string, (el: Element) => T> &
      Record<'default', (el: Element) => T>,
  ) {
    const element = assertValue(this.unwrap());
    const action =
      actions[element.tagName.toLocaleLowerCase()] ?? actions.default;
    await this.page.slowdown();
    return action(element);
  }

  // 'any' types are placeholders
  async fill(text: string, options?: any) {
    await this.doActionByTagName({
      input: (el) => {
        (el as HTMLInputElement).value = text;
      },
      default: (el) => {
        assertValue(el.querySelector('input')).value = text;
      },
    });
  }

  async check(value: boolean = true, options?: any) {
    await this.doActionByTagName({
      input: (el) => {
        (el as HTMLInputElement).checked = value;
      },
      default: (el) => {
        assertValue(el.querySelector('input')).checked = true;
      },
    });
  }

  async focus(options?: any) {
    await this.doActionByTagName({
      input: (el) => {
        (el as HTMLInputElement).focus();
      },
      default: (el) => {
        assertValue(el.querySelector('input')).focus();
      },
    });
  }

  async uncheck(options?: any) {
    await this.check(false, options);
  }

  async click(options?: any) {
    await this.doActionByTagName({
      default: (el) =>
        el.dispatchEvent(
          new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
          }),
        ),
    });
  }

  async dblclick(options?: any) {
    await this.doActionByTagName({
      default: (el) =>
        el.dispatchEvent(
          new MouseEvent('dblclick', {
            view: window,
            bubbles: true,
            cancelable: true,
          }),
        ),
    });
  }
}
