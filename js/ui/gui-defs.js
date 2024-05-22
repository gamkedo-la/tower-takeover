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

// A BuildTileUIInfo is a (topLeftC: Number, topLeftR: Number, buildTiles:
// [List-of TileType]) which represents
// (top left column in logical positioning, top left row in logical
// positioning, tile types the user can build).
const buildTileUIInfo = {
  topLeftC: 1,
  topLeftR: 5,
  buildTiles: world.buildTileOptions,
}

// In pixel position.
const unitsInTileUIInfo = {
  topLeftX: 800,
  topLeftY: 0,
}
