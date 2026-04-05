function pointInRect (x, y, rx, ry, rw, rh) {
  return (
    rx <= x && x < rx + rw &&
    ry <= y && y < ry + rh
  );
}


function minWhere (func) {
  let min       = arguments[1];
  let min_where = func(min);

  for (let i=2; i < arguments.length; i++) {
    const where = func(arguments[i]);

    if (where < min_where) {
      min       = arguments[i];
      min_where = where;
    }
  }

  return min;
}


function distance2 (x1, y1, x2, y2) {
  switch (arguments.length) {
    case 2:
      return (
        Math.pow(arguments[1][0] - arguments[0][0], 2) +
        Math.pow(arguments[1][1] - arguments[0][1], 2)
      );
    case 4:
      return (
        Math.pow(x2 - x1, 2) +
        Math.pow(y2 - y1, 2)
      );
    default:
      throw new TypeError(`distance2() requires 2 or 4 arguments, got ${arguments.length}`);
  }
}


function parseArgsThetaOrVector (theta_or_dx, dy) {
  let dx;
  let dt;

  switch (arguments.length) {
    case 1:
      if (typeof theta_or_dx === "number") {
        if (Number.isNaN(theta_or_dx)) {
          throw new TypeError("First argument is NaN");
        }

        dx = Math.cos(theta_or_dx);
        dy = Math.sin(theta_or_dx);
        dt = theta_or_dx;

      } else if (Array.isArray(theta_or_dx)) {
        [dx, dy] = theta_or_dx;
        dt = Math.atan2(dy, dx);

      } else {
        throw new TypeError(
          `Expected single argument to be a finite number or Array of finite numbers, got ${
            theta_or_dx?.constructor?.name ?? typeof theta_or_dx
          }`
        );
      }
      break;

    case 2:
      dx = theta_or_dx;
      dt = Math.atan2(dy, dx);
      break;

    default:
      throw new TypeError(`expects one or two arguments, got ${arguments.length}`);
  }

  return { dx, dy, dt };
}


export function getElementSpacnavThreshold (element) {
  let default_threshold = 2*Math.PI/3;

  if ("spacnav-threshold" in element.attributes) {
    let threshold_attr  = element.getAttribute("spacnav-threshold");
    let threshold_float = parseFloat(threshold_attr); // note: this ignores degrees suffix

    // An empty spacnav_threshold resets the default value
    if (threshold_attr == "") {
      return default_threshold;
    }

    if (! Number.isFinite(threshold_float)) {
      throw new TypeError(`Expected spacnav-threshold attribute to contain a finite float, got ${
        threshold_float?.constructor?.name ?? typeof threshold_float
      }`);
    }

    if (threshold_attr.endsWith("deg")) {
      return threshold_float / 180 * Math.PI;
    } else {
      return threshold_float;
    }

  } else {
    // The spacnav-threshold attribute was not found in this
    // element. Traverse parent containers looking for a defined
    // threshold, or go with the 90-degree default value.

    if (element.parentElement) {
      return getElementSpacnavThreshold(element.parentElement);
    } else {
      return default_threshold;
    }

  }
}


export function isSelectable () {
  return (
    this.tagName === "BUTTON"              ||
    this.classList.contains("button")      ||
    this.classList.contains("selectable")  ||
    this.hasAttribute("selectable")        ||
    this.hasAttribute("button")
  );
};


export function getSpacnavContainer () /* HTMLElement */ {
  let element;

  for (
    element = this.parentElement;
    element;
    element = element.parentElement
  ) if (
    element.isSpacnavContainer()
  ){
    return element;
  }

  return null;
};


export function getSpacnavContext () /* HTMLElement */ {
  // Get the selection context element. All spatial navigation
  // logic should be constrained to the current selection
  // context.

  let element;

  for (
    element = this.parentElement;
    element;
    element = element.parentElement
  ) if (
    element.isSpacnavContext()
  ){
    return element;
  }

  if (document.body.contains(this)) {
    return document.body;
  }

  return null;
};


export function isSpacnavContext () {
  return (
    this.classList.contains("spacnav-context") ||
    this.classList.contains("menu")
  );
};


export function isSpacnavContainer () {
  return (
    this.classList.contains("spacnav-container") ||
    this.classList.contains("spacnav-context") ||
    this.classList.contains("menu")
  );
};


export function handleDeselect () {
  this.blur();
};


export function handleSelect (previous_selection) {
  if (! (previous_selection instanceof HTMLElement || previous_selection == null)) {
    throw new TypeError(`Expected previous_selection to be nullish or an HTMLElement, got ${
      previous_selection?.constructor?.name ?? typeof previous_selection
    }`);
  }

  previous_selection?.handleDeselect();

  this.focus();
  this.scrollIntoView({
      behavior: "smooth",
      block:    "center",
      inline:   "center",
    });
};

export function findSpacnavElement (theta_or_dx, dy) /* HTMLElement */ {
  const found = this.findSpacnavElementWithinContext(null, ...arguments);

  if (found) {
    return found;
  }

  return this.getSpacnavContainer()?.findSpacnavElementWithinContext(null, ...arguments) ?? null;
};

export function findSpacnavElementWithinContext (selection_context, theta_or_dx, dy) /* HTMLElement */ {
  if (arguments.length < 2 || arguments.length > 3) {
    throw new TypeError(`Expected 2-3 arguments, got ${arguments.length}`);
  }

  var { dx, dy, dt } = parseArgsThetaOrVector(...Array.from(arguments).slice(1));

  let selection_container;
  let reference_selection_container;

  if (selection_context === null) {
    selection_context   = this.getSpacnavContext();
    selection_container = this.getSpacnavContainer();
    reference_selection_container = selection_container;

    if (!selection_container)
      return null;

  } else {
    selection_container = selection_context;
    reference_selection_container = this.getSpacnavContainer();
  }

  const rect = this.getBoundingClientRect();

  // Start raycasting from the intersection of the raycasting
  // vector and this element's perimeter.
  let start_x = rect.x + rect.width /2;
  let start_y = rect.y + rect.height/2;

  // Determine where the ray leaves this element's bounding box.
  // TODO: use math to calculate this instead of raycasting

  while (pointInRect(
    start_x + dx, start_y + dy,
    rect.x, rect.y, rect.width, rect.height,
  )) {
    start_x += dx;
    start_y += dy;
  }

  const searched_selection_containers = new Set();

  let step_length = 8;
  let max_steps   = 2000/step_length;  // TODO: could fail on large screen sizes. Maybe depend on viewport size?
  let element     = null;
  let num_steps   = 0;

  // Check up the selection container chain

  let min_distance  = null;
  let min_candidate = null;

  for (
    let checked = new Set([ this ]);

    selection_container && (
      ! selection_context ||
      selection_container === selection_context ||
      selection_context.contains(selection_container)
    );

    /* handled below: if selection_container === selection_context, this is the last iteration */

    checked.add(selection_container),
    selection_container = selection_container.getSpacnavContainer()
  ){
    for (let candidate of selection_container.iterSpacnavCandidates()) {
      if (checked.has(candidate)) {
        continue;
      }

      const distance = this.getSpacnavDistanceTo(dt, candidate);

      if (distance === null) {
        continue;
      }

      const is_same_selection_container = (candidate.getSpacnavContainer() === reference_selection_container);

      if (candidate.hasAttribute("spacnav-internal") && !is_same_selection_container) {
        continue;
      }

      if (!min_candidate || distance < min_distance) {
        let new_min_candidate = candidate;

        if (candidate.isSpacnavContainer()) {
          new_min_candidate = this.findSpacnavElementWithinContext(candidate, dx, dy);

          if (candidate.isSelectable()) {
            new_min_candidate ??= candidate;
          }
        }

        if (new_min_candidate) {
          min_distance  = distance;
          min_candidate = new_min_candidate;
        }
      }
    }

    checked.add(selection_container);

    if (selection_container === selection_context) {
      break;
    }

    if (min_candidate) {
      break;
    }
  }

  switch (min_candidate?.getAttribute("spacnav-refer")) {
    case "score":
      // TODO: how does the logic of this work with non-selectable selection containers?
      min_candidate = this.getSpacnavDistanceToWithinContext(min_candidate, dx, dy);
      break;

    case "first":
      min_candidate = candidate.querySelector("selectable, button");
      throw new Error("[spacnav-refer=first] not yet implemented");
  }

  return min_candidate; // Return the best candidate after checking all containers
};


export function * iterSpacnavContainers () {
  if (!this.isSpacnavContainer()) {
    return null;
  }

  for (
    let next, el = this.firstElementChild;
    el && el !== this;
    el = next
  ){
    if (el.isSpacnavContainer()) {
      yield el;
      next = el.nextElementSibling;
    } else if (el.isSelectable()) {
      next = el.nextElementSibling;
    } else {
      next = el.firstElementChild ??
             el.nextElementSibling;
    }

    // Search for an uncle element (sibling of the parent)
    for (
      let parent = el.parentElement ;
      !next && parent && parent !== this;
      parent = parent.parentElement
    ){
      next = parent.nextElementSibling;
    }
  }
}


export function * iterSpacnavCandidates () /* yields HTMLElement */ {
  if (!this.isSpacnavContainer()) {
    return null;
  }

  for (
    let next, el = this.firstElementChild;
    el && el !== this;
    el = next
  ){
    if (
      el.isSpacnavContainer() ||
      el.isSelectable()
    ){
      yield el;
      next = el.nextElementSibling;

    } else {
      next = el.firstElementChild ??
             el.nextElementSibling ;
    }

    // Search for an uncle element (sibling of the parent)
    for (
      let parent = el.parentElement ;
      !next && parent && parent !== this;
      parent = parent.parentElement
    ){
      next = parent.nextElementSibling;
    }
  }
};


export function getSpacnavDistanceTo (direction, candidate) {
  switch (arguments.length) {
    case 3:
      direction = [arguments[0], arguments[1]];
      candidate = arguments[2];
    case 2:
      break;

    default:
      throw new TypeError(`getSpacnavDistanceTo() expects 2-3 arguments, got ${arguments.length}`);
  }

  if ( ! (candidate instanceof HTMLElement)) {
    throw new TypeError(`getSpacnavDistanceTo() expects candidate to be an HTMLElement, got ${
      candidate?.constructor?.name ?? typeof candidate
    }`);
  }

  // Variable naming convention: this function uses naming
  // conventions which are usually frowned upon in programming
  // contexts, with the names being notably short and having
  // single-leter components. However, due to the amount of
  // math, it is used with a local naming convention.

  // Variables beginning with a capital letter refer to a
  // thing within the spatial navigation's evaluatory context.
  //
  // The important ones here are as follows:

  //   R  Reference, `this`, the element from whom the spatial
  //      navigation originates.

  //   C  Candidate, the element whose spatial navigation
  //      distance from the Reference is being evaluated.

  //   B  Beam, an infinite, monodirectional line with an
  //      origin point on the reference, pointing in the direction
  //      of the spatial navigation. The origin is on the
  //      perimeter of the reference.

  //   P  Projection, which refers to a point on the
  //      candidate's perimeter, as well as the trajectory to
  //      that point.

  // Beam's directional x-y vector and theta (angle)
  let Bdx, Bdy, Bdt;

  if (Array.isArray(direction)) {
    if (direction.length !== 2) {
      throw new TypeError(`getSpacnavDistanceTo() expects an array with a length of two, got ${direction.length}`);
    }

    [Bdx, Bdy] = direction;

    if (! Number.isFinite(Bdx) || ! Number.isFinite(Bdy)) {
      throw new TypeError("getSpacnavDistanceTo() expects an array with two finite numbers");
    }

    Bdt = Math.atan2(Bdy, Bdx);

  } else if (typeof direction === "number") {
    if (! Number.isFinite(direction)) {
      throw new TypeError("getSpacnavDistanceTo() expects a number denoting direction, but it is not finite");
    }

    Bdt = direction;
    Bdx = Math.cos(Bdt);
    Bdy = Math.sin(Bdt);

  } else {
    throw new TypeError(`getSpacnavDistance() to expects direction to by an Array of two finite numbers (a directional vector) or a finite number (angle in radians), got ${
      direction?.constructor?.name ?? typeof direction
    }`);
  }

  // Candidate and reference rectangular bounds
  const Rr  = this.getBoundingClientRect();
  const Cr  = candidate.getBoundingClientRect();
  const Rw  = Rr.width,     Rh  = Rr.height;    // Size shorthands
  const Cw  = Cr.width,     Ch  = Cr.height;
  const Rcx = Rr.x + Rw/2,  Rcy = Rr.y + Rh/2;  // Rect centers
  const Ccx = Cr.x + Cw/2,  Ccy = Cr.y + Ch/2;

  /*
    Calculate a point on the perimeter of the reference,
    opposite the direction of the beam, and intersecting with
    the center of the reference, like so:

      ----------
      |        |
    --B---Rc---|---->
      |        |
      ----------
      ^^^^^
      RBd: distance between the reference center and beam origin
  */

  // Distance between reference center and beam origin
  const RBd = Math.min(Math.abs(Rw/(Bdx || 0.0000001)), Math.abs(Rh/(Bdy || 0.0000001)))/2;
  const Bx  = Rcx - RBd*Bdx;
  const By  = Rcy - RBd*Bdy;

  /*
      ----------
      |        |     ---------
    --B---Rc---|---->P       |--->
      |        |     |   Cc  |
      ----------     |       |
                     ---------
  */

  // Candidate rectangle's edge shorthands
  const C_top = Cr.top ,  C_bot = Cr.bottom ;
  const C_lft = Cr.left,  C_rgt = Cr.right  ;

  if (!Number.isFinite(Bdx)) throw new Error("");

  // t-values along each edge (when extrapolated to being an
  // infinite line), where the beam intersects that edge.
  const C_lft_t = (Bx - C_lft) / (Bdx || 0.000001), C_rgt_t = (Bx - C_rgt) / (Bdx || 0.000001) ;
  const C_top_t = (By - C_top) / (Bdy || 0.000001), C_bot_t = (By - C_bot) / (Bdy || 0.000001) ;

  // Find the candidate edge intersection t-values, horizontal and vertical, which are nearest to 
  const Peh_t = minWhere(Math.abs, ...[C_top_t, C_bot_t]);
  const Pev_t = minWhere(Math.abs, ...[C_lft_t, C_rgt_t]);

  // Candidate horizontal and vertical edge intersection positions
  const Phy = (Peh_t === C_top_t ? C_top : C_bot);
  const Pvx = (Pev_t === C_lft_t ? C_lft : C_rgt);
  const Phx = Bx - Peh_t*Bdx;
  const Pvy = By - Pev_t*Bdy;

  const Ph_in_bounds               = (C_lft <= Phx && Phx <= C_rgt);
  const Pv_in_bounds               = (C_top <= Pvy && Pvy <= C_bot);
  const P_use_nearest_intersection = !(Ph_in_bounds ^ Pv_in_bounds);

  let Px, Py;

  if (P_use_nearest_intersection) {
    [Px, Py] = minWhere(
      ([px, py]) => distance2(px, py, Bx, By),
      [Phx, Phy], [Pvx, Pvy],
    );

    if (Px == undefined || Py == undefined) {
      return null;
    }

  } else if (Ph_in_bounds) {
    Px = Phx;
    Py = Phy;

  } else /* Pv_in_bounds */ {
    Px = Pvx;
    Py = Pvy;
  }

  Px = Math.min(C_rgt, Math.max(C_lft, Px));
  Py = Math.min(C_bot, Math.max(C_top, Py));

  const projected_angular_displacement = Math.abs( Math.PI * Math.sin(
      Math.abs(Math.atan2(Py-By, Px-Bx) - Bdt) / 2
    ));

  const threshold = getElementSpacnavThreshold(this);

  const projected_euclidean_distance = Math.sqrt(distance2(Bx, By, Px, Py));

  const Bd = (Px-Bx)*Bdx + (Py-By)*Bdy;

  if (
    projected_euclidean_distance == 0 ||
    Bd < 0 ||
    projected_angular_displacement > threshold
  ){
    return null;
  }

  const projected_angular_displacement_weight_curving = 1.6;
  const projected_angular_displacement_weight = Math.pow(
    Math.abs(projected_angular_displacement - threshold),
    projected_angular_displacement_weight_curving
  );

  const beam_distance_weight = 0.5;

  const distance = (
    Bd * beam_distance_weight +
    projected_euclidean_distance / (1+projected_angular_displacement_weight)
  );

  if (!Number.isFinite(distance)) {
    throw new Error(`Distance is not finite, got ${distance}. Something should be debugged.`);
  }
  return distance;
};


export function initSpacnavElementMethods () /* void */ {
  HTMLElement.prototype.isSelectable                    = isSelectable;
  HTMLElement.prototype.getSpacnavContainer             = getSpacnavContainer;
  HTMLElement.prototype.getSpacnavContext               = getSpacnavContext;
  HTMLElement.prototype.isSpacnavContext                = isSpacnavContext;
  HTMLElement.prototype.isSpacnavContainer              = isSpacnavContainer;
  HTMLElement.prototype.handleDeselect                  = handleDeselect;
  HTMLElement.prototype.handleSelect                    = handleSelect;
  HTMLElement.prototype.findSpacnavElement              = findSpacnavElement;
  HTMLElement.prototype.findSpacnavElementWithinContext = findSpacnavElementWithinContext;
  HTMLElement.prototype.iterSpacnavContainers           = iterSpacnavContainers;
  HTMLElement.prototype.iterSpacnavCandidates           = iterSpacnavCandidates;
  HTMLElement.prototype.getSpacnavDistanceTo            = getSpacnavDistanceTo;
}

export default initSpacnavElementMethods;
