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
  const conditions: Array<(el: Element) => boolean> = [];
  if (options.hasText !== undefined) {
    conditions.push(createTextMatcher(options.hasText, (el) => el.textContent));
  }
  if (options.hasNotText !== undefined) {
    const matcher = createTextMatcher(
      options.hasNotText,
      (el) => el.textContent,
    );
    conditions.push((el) => !matcher(el));
  }
  return filter(elements, (el) =>
    conditions.every((condition) => condition(el)),
  );
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

function* intersect<T>(lhs: Iterable<T>, rhs: Iterable<T>) {
  const other = new Set(rhs);
  return filter(lhs, other.has);
}

function* exclusion<T>(lhs: Iterable<T>, rhs: Iterable<T>) {
  const other = new Set(rhs);
  return filter(lhs, (item) => !other.has(item));
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
    createTextMatcher(tagName, (el) => el.tagName, options),
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
  ) {}

  private get valueRaw(): Iterable<Element> {
    if (typeof this.selector === 'string') {
      return this.page.document.querySelectorAll(this.selector);
    } else {
      return this.selector;
    }
  }

  private async withSlowdown<T>(thunk: () => T) {
    await this.page.slowdown();
    return thunk();
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
  ): Locator {
    return new Locator(
      this.page,
      typeof selectorOrIterable === 'string'
        ? mapSelector(this.valueRaw, selectorOrIterable)
        : selectorOrIterable,
      options,
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
    let filterLocator = this.locator(filterSelector(this.valueRaw, options));
    if (options.has !== undefined) {
      filterLocator = this.locator(
        intersect(filterLocator.valueRaw, options.has.valueRaw),
      );
    }
    if (options.hasNot !== undefined) {
      filterLocator = this.locator(
        exclusion(filterLocator.valueRaw, options.hasNot.valueRaw),
      );
    }
    return filterLocator;
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

  async click(options?: any) {
    await this.withSlowdown(() => {
      assertValue(this.unwrap()).dispatchEvent(
        new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }

  async dblclick(options?: any) {
    await this.withSlowdown(() => {
      assertValue(this.unwrap()).dispatchEvent(
        new MouseEvent('dblclick', {
          view: window,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }
}
