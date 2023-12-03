import { Locator } from './locator';
import { ByRoleOptions, PageOptions } from './types';
import { iterTree } from './utils';

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

  locator(selector: string | (() => Iterable<Element>)) {
    return new Locator(this, selector);
  }

  all() {
    return new Locator(this, () => iterTree(this.document));
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.all().getByText(text, options);
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator('label').getByLabel(text, options);
  }

  getByRole(role: string, options: ByRoleOptions = {}): Locator {
    return this.all().getByRole(role, options);
  }
}
