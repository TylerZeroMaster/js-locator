import { Locator } from './locator';

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
  document?: Document;
};

export type Point = {
  x: number;
  y: number;
};

export type ModifierKeys = 'Alt' | 'Control' | 'Meta' | 'Shift';

export type ElementHandleClickOptions = {
  force?: boolean;
  noWaitAfter?: boolean;
  modifiers?: ModifierKeys[];
  position?: Point;
  delay?: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  timeout?: number;
  trial?: boolean;
};
