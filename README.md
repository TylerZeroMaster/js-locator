# JSLocator (Working title)

Use playwright-like locators in a browser.

Some functionality from playwright locators is still WIP (example:
`locator('visible=true')`)

## Usage

npm install `<TBD>`

```js
const page = new JSLocator.Page();

// Click the last button that contains text matching RegExp
// Wait up to 5 seconds for the button to become selectable
page
  .locator('button')
  .getByText(/continue with github/i)
  .last()
  .click({ timeout: 5000 })
  .catch(console.error);


// Get all images that have a src
// Wait up to 1 second for locator to match any elements
page
  .locator('img[src]')
  .collect({ timeout: 1000 })
  .then(console.log);


// Use a custom locator function to filter elements
// Locator functions get and return Iterable<Element>
// The iterable is not necessarily an array; it could be a Generator
page
  .locator('button')
  .locator((it) => Array.from(it).filter((el) => ... ))
  .first()
  .click()
  .catch(console.error);
```
