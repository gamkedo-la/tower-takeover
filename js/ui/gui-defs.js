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
// DATA DEFINITIONS
// ================================================================================

// The length for one tile in the map.
const squareLength = 64;

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
  topLeftX: 800,
  topLeftY: 0,
}
