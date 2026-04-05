import { describe, test, it, expect, beforeEach, vi } from "vitest";
import initSpacnavElementMethods from "./spacnav.js";

// Set up a basic DOM environment for each test
beforeEach(() => {
  document.body.innerHTML = (`
    <style>
      *, *::before, *::after { box-sizing: inherit; }

      body {
        box-sizing: content-box;
        margin: 0;
      }
    </style>
  `);
 
  document.body.classList.add("spacnav-container");

  // Initialize the spatial navigation methods on HTMLElement.prototype
  initSpacnavElementMethods();
});


function makeRectElement(rect={}, isSelectable = false, is_selection_container = false) {
  const element = document.createElement("div");

  element.style.position = "absolute";
  element.style.left     = `${rect.left ?? rect.x ??  0 }px`;
  element.style.top      = `${rect.top  ?? rect.y ??  0 }px`;
  element.style.width    = `${rect.width          ?? 10 }px`;
  element.style.height   = `${rect.height         ?? 10 }px`;
  element.style.overflow = "hidden";

  element.textContent = rect.text;

  if (isSelectable) {
    element.setAttribute("selectable", "");
  }
  if (is_selection_container) {
    element.classList.add("spacnav-container");
  }

  document.body.appendChild(element);
  return element;
}


test("Element rect positioning (test internal)", () => {
  const rect = { x: 100, y: 200, width: 400, height: 300 };
  const el   = makeRectElement(rect);
  expect(el.getBoundingClientRect()).toMatchObject(rect);
});


test("HTMLElement.prototype.isSelectable", () => {
  expect(document.createElement("div").isSelectable()).toBe(false);
  expect(document.createElement("button").isSelectable()).toBe(true);

  const div_class_button = document.createElement("div");
  div_class_button.classList.add("button");
  expect(div_class_button.isSelectable()).toBe(true);

  const div_attribute_button = document.createElement("div");
  div_attribute_button.toggleAttribute("button");

  expect(div_attribute_button.isSelectable()).toBe(true);
});


describe("HTMLElement.prototype.isSpacnavContainer", () => {
  it("should return true for an element with class 'spacnav-container'", () => {
    const div = document.createElement("div");
    div.classList.add("spacnav-container");
    expect(div.isSpacnavContainer()).toBe(true);
  });

  it("should return true for an element with class 'menu'", () => {
    const div = document.createElement("div");
    div.classList.add("menu");
    expect(div.isSpacnavContainer()).toBe(true);
  });

  it("should return false for a non-container element", () => {
    const div = document.createElement("div");
    expect(div.isSpacnavContainer()).toBe(false);
  });
});


describe("HTMLElement.prototype.getSpacnavContainer", () => {
  it("should return the parent selection container", () => {
    const container = document.createElement("div");
    container.classList.add("spacnav-container");
    const child = document.createElement("div");
    container.appendChild(child);

    expect(child.getSpacnavContainer()).toBe(container);
  });

  it("should return the closest selection container when nested", () => {
    const grandparent = makeRectElement({}, false, true);
    const parent      = document.createElement("div");
    const child       = makeRectElement({}, true, false);

    grandparent.appendChild(parent);
    parent.appendChild(child);

    expect(child.getSpacnavContainer()).toBe(grandparent);
  });

  it("should return null if no selection container is found", () => {
    const div = document.createElement("div");
    expect(div.getSpacnavContainer()).toBe(null);
  });
});


describe("HTMLElement.prototype.handleSelect and handleDeselect", () => {
  it("handleSelect should focus the element and scroll it into view", () => {
    const element = document.createElement("button");

    const focus_spy  = vi.spyOn(element, "focus");
    const scroll_spy = vi.spyOn(element, "scrollIntoView");

    element.handleSelect(null);

    expect(focus_spy).toHaveBeenCalledTimes(1);
    expect(scroll_spy).toHaveBeenCalledWith({
      behavior: "smooth",
      block:    "center",
      inline:   "center",
    });

    focus_spy.mockRestore();
    scroll_spy.mockRestore();
  });

  it("handleDeselect should blur the element", () => {
    const element = document.createElement("button");

    const blur_spy = vi.spyOn(element, "blur");
    element.handleDeselect();

    expect(blur_spy).toHaveBeenCalledTimes(1);
    blur_spy.mockRestore();
  });

  it("handleSelect should call handleDeselect on previous selection if provided", () => {
    const previous_selection = document.createElement("button");
    const current_selection  = document.createElement("button");

    const deselect_spy = vi.spyOn(previous_selection, "handleDeselect");

    current_selection.handleSelect(previous_selection);

    expect(deselect_spy).toHaveBeenCalledTimes(1);
    deselect_spy.mockRestore();
  });
});


describe("HTMLElement.prototype.iterSpacnavCandidates", () => {
  it("yields selectable direct children of the selection container", () => {
    const container = makeRectElement({}, false, true);
    const button_1  = document.createElement("button");
    const div_1     = document.createElement("div"); div_1.toggleAttribute("selectable");
    const button_2  = document.createElement("button");

    container.appendChild(button_1);
    container.appendChild(div_1);
    container.appendChild(button_2);

    const candidates = Array.from(container.iterSpacnavCandidates());
    expect(candidates).toEqual([button_1, div_1, button_2]);
  });

  it("yields selectable elements inside nested non-selection container elements", () => {
    const root_container = document.createElement("div");
    document.body.appendChild(root_container);

    root_container.outerHTML = `
      <div id="container" class="spacnav-container">
        <div id="div_1">
          <button id="button_1"></button>
          <button id="button_2"></button>
          <div id="div_2">
            <button id="button_3"></button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root_container);

    const candidates = Array.from(window.container.iterSpacnavCandidates());

    expect(candidates).toEqual([
      window.button_1,
      window.button_2,
      window.button_3
    ]);
  });

  it("does not traverse into nested selection containers, but yields the container itself if selectable", () => {
    document.body.innerHTML = `
      <div id="container" class="spacnav-container">
        <div id="selectable_container" class="spacnav-container selectable">
          <button></button>
        </div>
      </div>
    `;

    const candidates = Array.from(
      window.container.iterSpacnavCandidates()
    );
    expect(candidates).toEqual([window.selectable_container]);
  });

  it("should not traverse into nested selection containers if the container is not selectable", () => {
    const container                = document.createElement("div");
    const non_selectable_container = makeRectElement({}, false, true);
    const button_inside            = document.createElement("button");
    non_selectable_container.appendChild(button_inside);

    container.appendChild(non_selectable_container);

    const candidates = Array.from(container.iterSpacnavCandidates());
    expect(candidates).toEqual([]);
  });

  it("should handle empty container", () => {
    const container  = document.createElement("div");
    const candidates = Array.from(container.iterSpacnavCandidates());
    expect(candidates).toEqual([]);
  });
});


describe("HTMLElement.prototype.findSpacnavElement", () => {
  it("should return null if no selection container is found", () => {
    const ref_element = makeRectElement();
    const found_element = ref_element.findSpacnavElement(0);
    expect(found_element).toBeNull();
  });

  it("returns the candidate with the minimum spatial navigation distance", () => {
    const ref_element = makeRectElement({ text: "reference" }, true);

    makeRectElement({ text: "further away",   x:  50 }, true);
    makeRectElement({ text: "behind",         x: -10 }, true);
    makeRectElement({ text: "not selectable", x:  10 }, false);
    makeRectElement({ text: "up",             y:  10 }, true);
    makeRectElement({ text: "diagonal",       x: 10,    y: 20 }, true);

    const closest_element = makeRectElement({ text: "closest", x:  20 }, true);

    const found_element = ref_element.findSpacnavElement(0);
    expect(found_element?.textContent).toBe("closest");
  });

  it("should consider candidates from parent selection containers when none are found", () => {
    const ref_element         = makeRectElement();
    const child_container     = makeRectElement({ x: -10,  y:  -10, width:  30, height:  30 }, false, true);
    const parent_container    = makeRectElement({ x: -100, y: -100, width: 200, height: 200 }, false, true);
    const candidate_in_child  = makeRectElement({ x:  -20, y:    0, width:  10, height:  10 }, true);
    const candidate_in_parent = makeRectElement({ x:   10, y:    0, width:  10, height:  10 }, true);

    child_container.appendChild(ref_element);
    parent_container.appendChild(child_container);
    child_container.appendChild(candidate_in_child);
    parent_container.appendChild(candidate_in_parent);

    const found_element = ref_element.findSpacnavElement(0);
    expect(found_element).toEqual(candidate_in_parent);
  });

  it("navigates to selectable items inside sibling selection containers, from an element inside another container", () => {
    const sibling_container = makeRectElement({
      text: "sibling-container",
      x: 10, y: 30, w: 80, h: 45,
    }, false, true);

    const sibling_intermediate_wrapper = makeRectElement({
      text: "sibling-intermediate-wrapper",
      x: 10, y: 30, w: 80, h: 45,
    }, false, false);

    const reference_container = makeRectElement(
      { text: "reference", x: 100, width: 100, height: 100 }, false, true
    );

    const child_a = makeRectElement({ text: "c1", x: 15, y: 35, w: 70, h: 15 }, true)
    const child_b = makeRectElement({ text: "c2", x: 15, y: 55, w: 70, h: 15 }, true)

    const ref = makeRectElement(
      { text: "reference", x: 100, height: 100 }, true
    );

    sibling_container.appendChild(sibling_intermediate_wrapper);
    sibling_intermediate_wrapper.appendChild(child_a);
    sibling_intermediate_wrapper.appendChild(child_b);
    reference_container.appendChild(ref);

    const found = ref.findSpacnavElement(Math.PI);

    expect(found, "expected to find one of the child elements").not.toBe(null);
    expect(found.textContent.startsWith("c")).toBe(true);
    expect(sibling_container.contains(found)).toBe(true);
  });

  it("navigates to selectable items inside sibling selection containers", () => {
    const sibling_container = makeRectElement({
      text: "sibling-container",
      x: 10, y: 30, w: 80, h: 45,
    }, false, true);

    const child_a = makeRectElement({ text: "c1", x: 15, y: 35, w: 70, h: 15 }, true)
    const child_b = makeRectElement({ text: "c2", x: 15, y: 55, w: 70, h: 15 }, true)

    sibling_container.appendChild(child_a);
    sibling_container.appendChild(child_b);

    const ref = makeRectElement(
      { text: "reference", x: 100, height: 100 }, true
    );

    const found = ref.findSpacnavElement(Math.PI);

    expect(found).not.toBe(null);
    expect(found.textContent.startsWith("c")).toBe(true);
    expect(sibling_container.contains(found)).toBe(true);

    expect(
      child_a.findSpacnavElement(-2*Math.PI/3)
    ).toBeFalsy();

    expect(
      child_a.findSpacnavElement(0)
    ).toBe(ref);
  });
});
