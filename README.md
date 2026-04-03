# Spatnav — HTMLElement bindings for generic spatial navigation

Spatial navigation is a means of navigating focusable elements in
an interface based on their positions, relative to one another.
Pressing up should move you upward, right should move you rightward, and
so on.

Spacnav, short for Spatial Navigation, is a series of function
bindings for `HTMLElement`s which provide spatial navigation
functionality. It was initially written for my web-based
roguelike game, but I split off the code into its own project.
Currently, this library's development is coupled to that game
project, but I am intending to isolate the code more over time.

There is a W3C spec draft the for the feature, but no official
spatial navigation functionality exists in browsers. This
implementation does not follow the W3C draft, and currently, it
does not implement any CSS properties to control spatial
navigation. It also does not set or define any event handling
functions, and leaves it to the developer to call the spatial
navigation methods. Over time, it may get reworked and move
closer to that specification.

## Initialization

The library does not automatically bind functions to
`HTMLElement`. Instead, call the default export,
`initSpacnavElementMethods()`. This function is idempotent.

```html
<script>
    import initSpacnavElementMethods from "spatnav.js";
    initSpacnavElementMethods();
</script>
```

## Using spatnav methods

## Tests

Automated testing is done with vitest and playwright in a
headless Chrome instance. To run tests, install NPM packages and
run the NPM test script:
```bash
npm i
npm test
```
