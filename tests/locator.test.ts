import { Page } from '../src/page';

const testDocument = `
<!DOCTYPE html>
<html>
<body>
  <div id="basic-id-test"></div>
  <form>
    <label for="label-test-id">Label Test</label>
    <input id="label-test-id" />
    <input id="by-role-test" type="checkbox" />
  </form>
  <div id="get-by-text">Get me by this text which no other element should contain</div>
  <div id="get-by-has-blockquote"><blockquote></blockquote></div>
  <div id="action-tests">
    <div><button style="position: absolute; top: 10px; left: 10px;" id="click-action-test" data-clicked="false">Click</button></div>
    <div><input id="fill-action-test" type="text"/></div>
    <div><input id="check-action-test" type="checkbox"/></div>
  </div>
</body>
</html>
`;

describe('Locator', () => {
  let document: Document;
  let page: Page;
  beforeEach(() => {
    const parser = new DOMParser();
    document = parser.parseFromString(testDocument, 'text/html');
    Array.from(document.querySelectorAll('*')).forEach((el) => {
      const htmlEl = el as HTMLElement;
      const top = parseInt(htmlEl.style.top || '0px');
      const left = parseInt(htmlEl.style.left || '0px');
      // jsdom does not support this method, so we mock it here (mostly)
      el.getBoundingClientRect = jest.fn().mockReturnValue({
        x: left,
        y: top,
        top,
        left,
      });
      if (el.id !== '') {
        el.setAttribute('data-value', el.id);
      }
    });
    page = new Page({ document });
  });
  describe('basic selector tests', () => {
    it('gets elements by id', () => {
      const div = page.locator('#basic-id-test').unwrapSync();
      expect(div).toBeDefined();
      expect(div?.getAttribute('data-value')).toBe('basic-id-test');
    });
    it('gets inputs by label', () => {
      const input = page.getByLabel('Label Test').unwrapSync();
      expect(input).toBeDefined();
      expect(input?.tagName.toLocaleLowerCase()).toBe('input');
      expect(input?.id).toBe('label-test-id');
    });
    it('gets inputs from form by label', () => {
      const form = page.locator('form');
      const input = form.getByLabel('Label Test').unwrapSync();
      expect(input).toBeDefined();
      expect(input?.tagName.toLocaleLowerCase()).toBe('input');
      expect(input?.id).toBe('label-test-id');
    });
    it('gets inputs by role', () => {
      const input = page.getByRole('checkbox').unwrapSync();
      expect(input).toBeDefined();
      expect(input?.tagName.toLocaleLowerCase()).toBe('input');
      expect(input?.id).toBe('by-role-test');
    });
    it('returns empty when parent is absent', () => {
      expect(
        page.locator('no-match').parentElement().collectSync(),
      ).toStrictEqual([]);
    });
  });
  describe('more advanced selectors', () => {
    it('gets elements by exact text', () => {
      const byText = page
        .getByText(
          'Get me by this text which no other element should contain',
          { exact: true },
        )
        .unwrapSync();
      expect(byText).toBeDefined();
      expect(byText?.id).toBe('get-by-text');
    });
    it('gets elements by partial text', () => {
      const byText = page
        .getByText('no other element should contain')
        .unwrapSync();
      expect(byText).toBeDefined();
      expect(byText?.id).toBe('get-by-text');
    });
    it('gets elements by regex', () => {
      const byText = page
        .getByText(/^Get me by this text.+?no other.+?contain$/)
        .unwrapSync();
      expect(byText).toBeDefined();
      expect(byText?.id).toBe('get-by-text');
    });
    it('gets elements containing blockquotes', () => {
      // Searching all by what they contain yields the entire tree above.
      // The last one is the most specific
      const html = page
        .locator('*')
        .filter({ has: page.locator('blockquote') })
        .first()
        .unwrapSync();
      const el = page
        .locator('*')
        .filter({ has: page.locator('blockquote') })
        .last()
        .unwrapSync();
      expect(html?.tagName.toLocaleLowerCase()).toBe('html');
      expect(el?.id).toBe('get-by-has-blockquote');
    });
    it('gets elements not containing blockquotes', () => {
      const hasNotBlockquote = page
        .locator('*')
        .filter({ hasNot: page.locator('blockquote') })
        .collectSync();
      expect(hasNotBlockquote.length).toBeGreaterThan(0);
      expect(hasNotBlockquote[0].tagName.toLocaleLowerCase()).not.toBe('html');
      expect(
        hasNotBlockquote.find((el) => el.id === 'get-by-has-blockquote'),
      ).not.toBeDefined();
    });
    it('gets elements containing text', () => {
      const hasText = page
        .locator('*')
        .filter({ hasText: 'Get me by this text' })
        .collectSync();
      expect(hasText[0]?.tagName.toLocaleLowerCase()).toBe('html');
      expect(hasText[hasText.length - 1]?.id).toBe('get-by-text');
    });
    it('gets elements not containing text', () => {
      const hasNotText = page
        .locator('*')
        .filter({ hasNotText: 'Get me by this text' })
        .collectSync();
      expect(hasNotText[0]?.tagName.toLocaleLowerCase()).not.toBe('html');
      expect(
        hasNotText.find((el) => el.id === 'get-by-text'),
      ).not.toBeDefined();
    });
  });
  describe('action methods', () => {
    it('clicks', async () => {
      const button = page.locator('#click-action-test').unwrapSync();
      let posX: number, posY: number, shift: boolean;
      expect(button?.getAttribute('data-clicked')).toBe('false');
      button!.addEventListener('click', function (e) {
        posX = (e as MouseEvent).clientX;
        posY = (e as MouseEvent).clientY;
        shift = (e as MouseEvent).shiftKey;
        this.setAttribute('data-clicked', 'true');
      });
      await page.locator('#click-action-test').click();
      expect(button?.getAttribute('data-clicked')).toBe('true');
      expect(posX!).toBe(10);
      expect(posY!).toBe(10);
      expect(shift!).toBe(false);
    });
    it('dblclicks', async () => {
      const button = page.locator('#click-action-test').unwrapSync();
      expect(button?.getAttribute('data-clicked')).toBe('false');
      button!.addEventListener('dblclick', function () {
        this.setAttribute('data-clicked', 'true');
      });
      await page.locator('#click-action-test').dblclick();
      expect(button?.getAttribute('data-clicked')).toBe('true');
    });
    it('clicks with options', async () => {
      const button = page.locator('#click-action-test').unwrapSync();
      let posX: number, posY: number, shift: boolean;
      expect(button?.getAttribute('data-clicked')).toBe('false');
      button!.addEventListener('click', function (e) {
        posX = (e as MouseEvent).clientX;
        posY = (e as MouseEvent).clientY;
        shift = (e as MouseEvent).shiftKey;
        this.setAttribute('data-clicked', 'true');
      });
      await page.locator('#click-action-test').click({
        position: {
          x: 1,
          y: 3,
        },
        modifiers: ['Shift'],
      });
      const box = button?.getBoundingClientRect();
      expect(box!.x).toBe(10);
      expect(button?.getAttribute('data-clicked')).toBe('true');
      expect(posX!).toBe(11);
      expect(posY!).toBe(13);
      expect(shift!).toBe(true);
    });
    it('fills and focuses', async () => {
      const el = page.locator('#fill-action-test').unwrapSync();
      expect(el).toBeDefined();
      const input = el as HTMLInputElement;
      expect(input.value).toBe('');
      await page.locator('#fill-action-test').fill('test');
      expect(input.value).toBe('test');

      input.addEventListener('focus', function () {
        this.setAttribute('data-was-focused', 'true');
      });
      expect(input.getAttribute('data-was-focused')).toBeFalsy();
      await page.locator('#fill-action-test').focus();
      expect(input.getAttribute('data-was-focused')).toBeTruthy();
    });
    it('checks and unchecks', async () => {
      const el = page.locator('#check-action-test').unwrapSync();
      expect(el).toBeDefined();
      const input = el as HTMLInputElement;
      expect(input.checked).toBe(false);
      await page.locator('#check-action-test').check();
      expect(input.checked).toBe(true);
      await page.locator('#check-action-test').uncheck();
      expect(input.checked).toBe(false);
    });
    it('tries its best to find the text input', async () => {
      const el = page.locator('#fill-action-test').unwrapSync();
      expect(el).toBeDefined();
      const input = el as HTMLInputElement;
      expect(input.value).toBe('');
      await page.locator('#fill-action-test').parentElement().fill('test');
      expect(input.value).toBe('test');
    });
    it('tries its best to find the checkbox input', async () => {
      const el = page.locator('#check-action-test').unwrapSync();
      expect(el).toBeDefined();
      const input = el as HTMLInputElement;
      expect(input.checked).toBe(false);
      await page.locator('#check-action-test').parentElement().check();
      expect(input.checked).toBe(true);
    });
  });
  describe('page slowmo', () => {
    it('waits the specified time', async () => {
      const pageWithSlowmo = new Page({ slowmo: 200, document });
      const el = pageWithSlowmo.locator('#check-action-test').unwrapSync();
      expect(el).toBeDefined();
      const input = el as HTMLInputElement;
      const start = Date.now();
      expect(input.checked).toBe(false);
      await pageWithSlowmo
        .locator('#check-action-test')
        .parentElement()
        .check();
      expect(input.checked).toBe(true);
      expect(Date.now() - start).toBeGreaterThan(100);
    });
  });
  describe('async', () => {
    it('gets the content after a delay', async () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString('', 'text/html');
      const page = new Page({ document: doc });
      const end = Date.now() + 100;
      new Promise((res) => setTimeout(res, 200)).then(() => {
        // Trigger one mutation
        doc.body.innerHTML = '<div>Loading...</div>';
        // Trigger second mutation
        doc.body.innerHTML = document.body.innerHTML;
      });
      const input = await page
        .locator('form')
        .getByLabel('Label Test')
        .locator('input')
        .nth(0)
        .unwrap({ timeout: 1000 });
      expect(input).toBeDefined();
      expect(input?.matches('input')).toBe(true);
      expect(input?.id).toBe('label-test-id');
      expect(Date.now()).toBeGreaterThan(end);
    });
    it('gets the content without delay', async () => {
      const end = Date.now() + 100;
      const input = await page
        .locator('form')
        .getByLabel('Label Test')
        .locator('input')
        .nth(0)
        .unwrap({ timeout: 1000 });
      expect(input).toBeDefined();
      expect(input?.matches('input')).toBe(true);
      expect(input?.id).toBe('label-test-id');
      expect(Date.now()).toBeLessThan(end);
    });
    it('times out', async () => {
      await expect(async () => {
        await page
          .locator('test-this-should-not-match')
          .collect({ timeout: 10 });
      }).rejects.toThrow(/Timeout/i);
    });
  });
});
