import { Locator } from './locator';
import { ByRoleOptions, PageOptions } from './types';

export class Page {
  public readonly slowdown: () => Promise<void>;

  constructor(
    options?: PageOptions,
    /* istanbul ignore next */
    public readonly document = window.document,
  ) {
    this.slowdown =
      options?.slowmo !== undefined
        ? () => new Promise((res) => setTimeout(res, options.slowmo))
        : () => Promise.resolve();
  }

  locator(selector: string | Iterable<Element>) {
    return new Locator(this, selector);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator('*').getByText(text, options);
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator('label').getByLabel(text, options);
  }

  getByRole(role: string, options: ByRoleOptions = {}): Locator {
    return this.locator('*').getByRole(role, options);
  }
}
