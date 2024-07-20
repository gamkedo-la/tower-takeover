// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for providing the GUI data definitions to the ui module.

// ================================================================================
// DEPENDENCIES
// ================================================================================
// world.buildTileOptions from world.js

// NOTE(marvin): Needing buildTileOptions is probably removable in the long-term.

// ================================================================================
// CONSTANTS
// ================================================================================

// The length for one tile in the map.
const squareLength = 64;

// In pixels, should be the same as the one in index.html.
const screenWidth = 1200;
const screenHeight = 680;

const unitInTileUIInfo = {
  l: 42, // Really should be called "h" for height.
  w: 32,
  dl: 4,
  dw: 4,
}

// A BuildTileUIInfo is a (topLeftC: Number, topLeftR: Number, buildTiles:
// [List-of TileType]) which represents
// (top left column in logical positioning, top left row in logical
// positioning, tile types the user can build).
const buildTileUIInfo = {
  topLeftC: 1,
  topLeftR: 8,
  buildTiles: world.buildTileOptions,
}

// In pixel position.
const unitsInTileUIInfo = {
  topLeftX: 900,
  topLeftY: 0,
}

const modeUIInfo = {
  topLeftX: 0,
  topLeftY: 0,
  w: 32,   // for one, in px
  h: 32,   // for one, in px
  clickModes: [
    CLICK_MODE.INFO,
    CLICK_MODE.BUILD,
    CLICK_MODE.ONE_OFF_PATH,
    CLICK_MODE.ONE_END_CYCLIC_PATH,
    CLICK_MODE.TWO_END_CYCLIC_PATH,
  ],
}

const tileStatsUIInfo = {
  // Both in pixels
  topLeftX: 900,
  topLeftY: 256,
}

const cyclicPathsUIInfo = {
  // All in pixels
  topLeftX: 0,
  topLeftY: 448,  // If there are 7 rows, map height is 64*7=448
  w: 832,  // If there are 13 cols, map width is 64*13=832
}

// ================================================================================
// STATE
// ================================================================================
// Instead of computing everything we need to draw something each and every
// frame, we can save the computation and refer back to them in the
// future. Aside from improving performance, it also allows both draw and input
// handling to know where things are located without each of them having to know
// how things are laid out. Though, this means that we must know when to
// recompute the draw state so that the logic and GUI don't go out of
// sync. Currently, drawState can be modified by both draw.js and input.js, but
// not logic. draw.js should only change data that has to do with drawing, and
// input.js should only change data that has to do with control flow (e.g. what
// data needs to be recomputed). There is probably a better way of organizing this.

// A DrawState is a (cyclicPaths: CyclicPathsDrawState)

// A CyclicPathsDrawSTate is a (hasChanged: Bool, pathBoxUIInfos: [Array-of PathBoxUIInfo])

// A PathBoxUIInfo is a (topLeftX: Nat, topLeftY: Nat, w: Nat, h: Nat,
// deleteUIInfo: DeleteUIInfo, path: CyclicPath).
// Represents where a single path box inside cyclic path UI lies in screen space
// and in pixels.

// A DeleteUIInfo is a (topLeftX: Nat, topLeftY: Nat, w: Nat, h: Nat)
// Represents a region in screen space in pixels where a delete button is at.

let drawState = {
  cyclicPaths: {
    hasChanged: false,  // Toggled by input.js
    pathBoxUIInfos: [],  // Reset and filled in by draw.js
  },
};
