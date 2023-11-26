import { Locator } from './locator';
import { ByRoleOptions, PageOptions } from './types';
import { assertValue } from './utils';

export class Page {
  public readonly slowdown: () => Promise<void>;

  constructor(
    options?: PageOptions,
    /* istanbul ignore next */
    public readonly document = window.document,
  ) {
    this.slowdown =
      options?.slowmo !== undefined
        ? () => new Promise((res, rej) => setTimeout(res, options.slowmo))
        : () => Promise.resolve();
  }

  locator(selector: string | Iterable<Element>) {
    return new Locator(this, selector);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator('*').getByText(text, options);
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.locator(
      this.locator('label')
        .getByText(text, options)
        .collect()
        .map((el: HTMLLabelElement) =>
          assertValue(this.document.getElementById(el.htmlFor)),
        ),
    );
  }

  getByRole(role: string, options: ByRoleOptions = {}): Locator {
    return this.locator('*').getByRole(role, options);
  }
}
