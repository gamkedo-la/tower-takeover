// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for updating the game state with the rules as defined in this
// module. An equivalent name for this would model, as in the model from
// MVC. The highest-level function exposed is onTick, which ought to be only
// called once by main.js as part of the event loop. Lower-level functions can
// also be exposed for the input-handling. In theory, onTick ought to be defined
// in main.js, but it's nice to be able to have it grouped with all the
// logic-related code.
// 
// onTick() -> void
// Updates the current state of the world to a new state, independent of user
// input.

// ================================================================================
// DATA DEFINITIONS
// ================================================================================
// A World is a {grid: [2D-array-of Tile], routes: [Array-of Pos]}
// Represents a 2D grid of tiles, and the routes which the units traverse
// between in the grid.

// A Pos is a {x: Integer, y: Integer}
// Represents the positio in the world's grid, where the larger x is, the more
// rightward in the grid, and the larger y is, the more downward in the grid.

// A Tile is one of:
// - WalkableTile
// - FoodStorage
// - FoodFarm
// Represents the type of tile that it is.

// A WalkableTile is a [Array-of WalkingUnit]
// Represents a tile that may or may not have units traversing it.

// A WalkingUnit is a {unit: Unit, direction: Direction, isCarryingFood: Boolean}
// Represents a unit that is moving to a particular direction or not moving, and
// may or may not be carrying food.

// A Direction is one of:
// - TO: 0
// - FROM: 1
// - STATIONARY: 2
// Represents whether a unit is moving and if so where.
const DIRECTION = Object.freeze({
  TO: 0,
  FROM: 1,
  STATIONARY: 2,
});

// A FoodStorage is a {foodStored: Integer, units: [Array-of Unit]}
// Represents the amount of food contained and the units inside.

// A FoodFarm is a {farmers: [Array-of Unit], guards: [Array-of Unit],
// foodStored: Integer}
// Represents the units working, the units standing guard, and the food stored.

// A Unit is a {energy: Integer}
// Represents that which has a energy meter.

// ================================================================================
// FUNCTIONS
// ================================================================================

function onTick() {
}
