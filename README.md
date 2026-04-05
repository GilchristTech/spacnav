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
functions. The developer must call the spatial navigation methods
and implement event handling themselves. Over time, it may get
reworked and move closer to that specification.

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

This module adds several methods to `HTMLElement`.

### `isSelectable()`

Returns `true` if the element can be focused via spatial
navigation. By default, this includes `<button>` elements, or any
element with the class `button` or `selectable`, or the
attributes `selectable` or `button`.

*note*: At a later point, these classes and attributes may be
replaced with CSS properties, similar to the W3C specification
draft.

### `findSpacnavElement(direction_or_theta)`

Finds the lowest-scoring candidate for spatial navigation in a
given direction.

- `direction_or_theta`: Can be a numeric angle in radians or a
  directional vector in the form of a 2-element `Array`: `[dx, dy]`.
- Returns the `HTMLElement` with the lowest score, or `null` if
  no suitable candidate is found.

### `handleSelect(previous_selection)`

Standard handler for selecting an element. It calls
`handleDeselect()` on the `previous_selection` (if provided),
focuses the current element, and scrolls it into view.

### `handleDeselect()`

Standard handler for deselecting an element. By default, it calls
`this.blur()`.

### `isSpacnavContainer()`

Returns `true` if the element is marked as a spatial navigation
container (has class `spacnav-container`, `spacnav-context`, or
`menu`). Containers help organize and limit the scope of spatial
navigation.

*note*: The `menu` class will be removed from this module,
as it is specific to the game code this module is based on.

### `getSpacnavContainer()`

Returns the closest parent element that is a spatial navigation
container.

### `iterSpacnavCandidates()`

A generator that yields all selectable elements or nested
containers within the current container. It does not recurse into
nested containers but yields the containers themselves if they
are selectable.

### `getSpacnavDistanceTo(direction, candidate)`

Calculates a "distance" score to a candidate element in a
specific direction.  This is used internally by
`findSpacnavElement` to determine the best next element. Lower
scores are better. It returns `null` if the candidate is not in
the specified direction or exceeds the angular threshold.

## Configuration

### `spacnav-threshold` attribute

You can control how "wide" the search beam is by setting the
`spacnav-threshold` attribute on an element or any of its
parents.

- Value can be in radians (e.g., `1.57`) or degrees (e.g., `90deg`).
- Default is `2π/3` (approx 120 degrees).

## Tests

Automated testing is done with vitest and playwright in a
headless Chrome instance. To run tests, install NPM packages and
run the NPM test script:
```bash
npm i
npm test
```

## Credits

`spacnav` was developed by [Gilchrist
Pitts](https://gilchrist.tech), initially for a web-based game
project.

Originally, it was made as an attempt to modify the algorithm in
the CSS Spatial Navigation Module Level 1 specification draft:
* [https://drafts.csswg.org/css-nav-1/](https://drafts.csswg.org/css-nav-1/)

## License

MIT
