// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for updating the game state with the rules as defined in this
// module. An equivalent name for this would model, as in the model from
// MVC. The highest-level function exposed is onTick, which ought to be only
// called once by main.js as part of the event loop. Lower-level functions can
// also be exposed for the input-handling. In theory, onTick ought to be defined
// in main.js, but it's nice to be able to have it grouped with all the
// logic-related code. The world state is also exposed, but ideally for
// observation only, primarily for the draw module to be able to just read from
// the struct.
// 
// onTick() -> void
// Updates the current state of the world to a new state, independent of user
// input.

// ================================================================================
// DATA DEFINITIONS
// ================================================================================
// A World is a {grid: [2D-array-of Tile], paths: [Array-of Path]}
// Represents a 2D grid of tiles, and the paths which the units traverse between
// in the grid.

// A Path is a {orderedPoss: [Array-of Pos], lastIndex: Integer}
// Represents an ordered list of positions from source to destination which
// units traverse, and the lastIndex ought to be the length of the orderedPoss
// minus one. The Pos corresponds to the row and column of the world
// grid. Assume that the length of orderedPoss is at least two.

// A Pos is a {r: Integer, c: Integer}
// Represents the position in the world's grid, where the larger r is, the more
// downward in the grid, and the larger c is, the more rightward in the grid.

// A Tile is one of:
// - Wall
// - WalkableTile
// - FoodStorage
// - FoodFarm
// Represents the type of tile that it is.

// A Wall is a {tag: TileType}
// Represents a tile type that cannot be walked into but can be replaced with
// other tile types.

// A WalkableTile is a [Array-of Unit]
// Represents a tile that may or may not have units traversing it.

// A Unit is a {energy: Integer, pathId: Integer, indexInPath: Integer, direction:
// Direction, isCarryingFood: Boolean, hasMovedInTick: Boolean }
// Represents a unit that is moving to a particular direction or not moving, and
// may or may not be carrying food. pathId and indexInPath are both -1 if the
// unit is not associated with any paths.

// A Direction is one of:
// - TO: 0
// - FROM: 1
// - STATIONARY: 2
// Represents whether a unit is moving TO the destination, or FROM the
// destination, or not moving at all.
const DIRECTION = Object.freeze({
  TO: 0,
  FROM: 1,
  STATIONARY: 2,
});

// A TileType is one of:
// - WALL: 0
// - FOOD_STORAGE: 1
// - FOOD_FARM: 2
// Represents the type of tile. The WalkableTile is notably missing because it
// is an array and does not need a tag to distinguish itself.
const TILE_TYPE = Object.freeze({
  WALL: 0,
  FOOD_STORAGE: 1,
  FOOD_FARM: 2,
  CAPITAL: 3,
});

// A FoodStorage is a {tag: TileType, foodStored: Integer, guards: [Array-of Unit],
// pathUnitsQueues: [Array-of PathUnitsQueue]}
// Represents the amount of food contained, the guards, the paths it is on and
// the units waiting to be deployed on the path in order.

// A PathUnitsQueue is a {pathId: Integer, unitsQueue: [Queue-of Units]}
// Represents a queue of units to be deployed on the path.

// A FoodFarm is a {tag: TileType, farmers: [Array-of Unit], guards: [Array-of Unit],
// foodStored: Integer, pathUnitsQueues: [Array-of PathUnitsQueue]}
// Represents the units working, the units standing guard, and the food stored.

// A Capital is a {tag: TileType, isQueenAlive: Boolean, eggTimeGroups: [Array-of
// EggTimeGroup], guards: [Array-of Unit], foodStored: Integer, pathUnitsQueues:
// [Array-of PathUnitsQueue]}
// Represents the building in which eggs are laid and hatched into units.

// An EggTimeGroup is a {ticksPassed: Integer, eggs: Integer}
// Represents a group of eggs that have been laid for some number of ticks.

// --------------------------------------------------------------------------------
// INITIAL STATE
// --------------------------------------------------------------------------------
const wall = {tag: TILE_TYPE.WALL};
const emptyWalkableTile = [];
const paths0 =  [{
  orderedPoss: [
    {r: 1, c: 1},
    {r: 1, c: 2},
    {r: 2, c: 2},
    {r: 3, c: 2},
  ],
  lastIndex: 3,
}];
const foodFarmUnit = {
  energy: 100,
  pathId: 0,
  indexInPath: 0,
  direction: DIRECTION.TO,
  isCarryingFood: false,
  hasMovedInTick: false,
};
const foodStorageUnit = {
  ...foodFarmUnit,
  direction: DIRECTION.FROM,
  indexInPath: 3,
};
const fsUnit1 = structuredClone(foodStorageUnit);
const fsUnit2 = structuredClone(foodStorageUnit);
const fsUnit3 = structuredClone(foodStorageUnit);
const fsUnit4 = structuredClone(foodStorageUnit);

const foodStorage = {
  tag: TILE_TYPE.FOOD_STORAGE,
  foodStored: 10,
  guards: [],
  pathUnitsQueues: [{pathId: 0, unitsQueue: []}],
};
const unit1 = structuredClone(foodFarmUnit);
const unit2 = structuredClone(foodFarmUnit);
const unit3 = structuredClone(foodFarmUnit);
const unit4 = structuredClone(foodFarmUnit);
const foodFarm = {
  tag: TILE_TYPE.FOOD_FARM,
  farmers: [],
  guards: [],
  foodStored: 10,
  pathUnitsQueues: [{pathId: 0, unitsQueue: []}],
};
const singleUnit = {
  energy: 100,
  pathId: 0,
  indexInPath: 1,
  direction: DIRECTION.FROM,
  isCarryingFood: false,
  hasMovedInTick: false,
};
const singleUnit2 = {...singleUnit, indexInPath: 2};
const capital = {
  tag: TILE_TYPE.CAPITAL,
  isQueenAlive: true,
  eggTimeGroups: [{ticksPassed: 2, eggs: 5}, {ticksPassed: 5, eggs: 10}],
  guards: [],
  foodStored: 1000,
  pathUnitsQueues: [],
};
const initialWorld = {
  grid: [
    [wall, wall, capital, wall],
    [wall, foodFarm, [], wall],
    [wall, wall, [], wall],
    [wall, wall, foodStorage, wall],
  ],
  paths: paths0}

// --------------------------------------------------------------------------------
// WORLD STATE
// --------------------------------------------------------------------------------
var world = initialWorld;

// ================================================================================
// FUNCTIONS
// ================================================================================

let count = 0;

function onTick() {
  _onTickUnitsEatAndDecay(world);
  _onTickFoodPath(world);
  _onTickEggs(world);
}

// --------------------------------------------------------------------------------
// EAT AND DECAY FUNCTIONS
// --------------------------------------------------------------------------------

// Updates all units to gain and lose energy, such that units have a chance to
// eat before completely dying, and units that have full energy will lose energy
// first before eating again.
function _onTickUnitsEatAndDecay(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileEatAndDecay(tile);
    }
  }
}

function _onTickTileEatAndDecay(tile) {
  if (Array.isArray(tile)) {
    // Decay only, don't eat the food at hand.
    for (const unit of tile) {
      unit.energy--;
    }
  } else if (tile.tag === TILE_TYPE.WALL) {
    // Do nothing, there are no units inside a wall.
  } else if (tile.tag === TILE_TYPE.FOOD_FARM) {
    // Food farm should restore food first.
    tile.foodStored += 50;

    tile.foodStored = _feedUnits(tile.guards, tile.foodStored);
    tile.foodStored = _feedUnits(tile.farmers, tile.foodStored);

    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      tile.foodStored = _feedUnits(pathUnitsQueue.unitsQueue, tile.foodStored);
    }
  } else if (tile.tag === TILE_TYPE.FOOD_STORAGE) {
    tile.foodStored = _feedUnits(tile.guards, tile.foodStored);

    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      tile.foodStored = _feedUnits(pathUnitsQueue.unitsQueue, tile.foodStored);
    }
  } else if (tile.tag === TILE_TYPE.CAPITAL) {
    // For now no definition for queen ants, so don't feed the queen for now.
    tile.foodStored = _feedUnits(tile.guards, tile.foodStored);

    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      tile.foodStored = _feedUnits(pathUnitsQueue.unitsQueue, tile.foodStored);
    }
  }
}

// ([Array-of Unit], Integer) -> Integer
// Feeds the given list of units, with the given food remaining, returning the
// food remaining after as many of the the given units have been fed.
function _feedUnits(units, foodRemaining) {
  for (const unit of units) {
    const unitSpaceForFood = 100 - unit.energy;
    const foodToTake = Math.min(10, foodRemaining, unitSpaceForFood);
    unit.energy = Math.min(foodToTake, 100);
    foodRemaining -= foodToTake;
  }

  return foodRemaining;
}

// --------------------------------------------------------------------------------
// FOOD ROUTE FUNCTIONS
// --------------------------------------------------------------------------------

// Updates all units to take one step closer to their destination, and if a unit
// is already at their destination, to drop off what they are carrying, or to
// take a resource and leave one step out.
function _onTickFoodPath(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];
 
      _onTickTileInFoodPath(tile, world.grid, world.paths);
    }
  }

  // Resetting the unit.hasMovedInTick flag for all units in World
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      // Reset units in tile
      if (Array.isArray(tile)) {
	for (const unit of tile) {
	  unit.hasMovedInTick = false;
	}
      } else if (tile.tag == TILE_TYPE.WALL) {
	// Do nothing.
      } else {
	// Assume that tile has a pathUnitsQueues field
	for (const pathUnitsQueue of tile.pathUnitsQueues) {
	  // Resetting the unit.hasMovedInTick flag for PathUnitsQueue
	  for (const unit of pathUnitsQueue.unitsQueue) {
	    unit.hasMovedInTick = false;
	  }
	}
      }
    }
  }
}

function _onTickTileInFoodPath(tile, worldGrid, worldPaths) {
  if (Array.isArray(tile)) {
    // Cannot use for...of loop because array will be modified.
    for (let i = tile.length - 1; i >= 0; i--) {
      _onTickUnitInFoodPath(tile[i], worldGrid, worldPaths);
    }
  } else if (tile.tag == TILE_TYPE.WALL) {
    // Do nothing.
  } else {
    // Assume has the field pathUnitsQueues
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      _onTickPathUnitsQueue(pathUnitsQueue, worldGrid, worldPaths);
    }
  }
}

// (Unit, [2D-array-of Tile], [Array-of Path]): Void
// Moves the given unit one step forward in the direction of its path
// (if moving at all), and if arrive at source or destination, add the unit to
// the queue, and drop off food if arrive at storage. If leaving source or
// destination, take food if farm.
function _onTickUnitInFoodPath(unit, worldGrid, worldPaths) {
  // Moves the given unit one step forward in the given path from its given index
  // with the given direction, if it is moving.
  if (unit.hasMovedInTick) {
    return;
  }  

  const path = worldPaths[unit.pathId];

  let newIndexInPath = unit.indexInPath;
  if (unit.direction == DIRECTION.TO) {
    newIndexInPath++;
  } else if (unit.direction == DIRECTION.FROM) {
    newIndexInPath--;
  } else if (unit.direction == DIRECTION.STATIONARY) {
    unit.hasMovedInTick = true;
    return;
  }

  const posToMoveFrom = path.orderedPoss[unit.indexInPath];
  const posToMoveTo = path.orderedPoss[newIndexInPath];

  const tileToMoveFrom = worldGrid[posToMoveFrom.r][posToMoveFrom.c];
  const tileToMoveTo = worldGrid[posToMoveTo.r][posToMoveTo.c];

  _removePathUnitFromTile(tileToMoveFrom, unit, unit.pathId);
  _addPathUnitToTile(tileToMoveTo, unit, unit.pathId);

  // Update unit's fields.
  unit.indexInPath = newIndexInPath;

  // Change unit's direction if arrive at either end of the path.
  if (unit.indexInPath === path.lastIndex) {
    unit.direction = DIRECTION.FROM;
  } else if (unit.indexInPath === 0) {
    unit.direction = DIRECTION.TO;
  }

  unit.hasMovedInTick = true;
}

// (Tile, Unit, Integer): Void
// Removes the given unit on the given path ID from the given tile, if it
// exists, taking food with the unit if the given tile is a food farm.
function _removePathUnitFromTile(tile, unit, pathId) {
  if (Array.isArray(tile)) {
    _removeUnitFromUnits(tile, unit);
  } else if (tile.tag == TILE_TYPE.WALL) {
    // Do nothing.
    console.log("Illegal state: Adding path unit to a wall tile.");
  } else if (tile.tag == TILE_TYPE.FOOD_STORAGE) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      // Remove the given unit from the given pathUnitsQueue of the given pathId.
      if (pathUnitsQueue.pathId == pathId) {
	_removeUnitFromUnits(pathUnitsQueue.unitsQueue, unit);
	break;
      }
    }
  } else if (tile.tag == TILE_TYPE.FOOD_FARM) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      // Remove the given unit from the given pathUnitsQueue of the given pathId.
      if (pathUnitsQueue.pathId == pathId) {
	_removeUnitFromUnits(pathUnitsQueue.unitsQueue, unit);
	unit.isCarryingFood = true;
	tile.foodStored--;
	break;
      }
    }
  } else if (tile.tag == TILE_TYPE.CAPITAL) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      // Remove the given unit from the given pathUnitsQueue of the given pathId.
      if (pathUnitsQueue.pathId == pathId) {
	_removeUnitFromUnits(pathUnitsQueue.unitsQueue, unit);
	break;
      }
    }
  }
}

// (Tile, Unit, Integer): Void
// Adds the given unit in a path to the given tile with the given path ID.
function _addPathUnitToTile(tile, unit, pathId) {
  if (Array.isArray(tile)) {
    tile.push(unit);
  } else if (tile.tag == TILE_TYPE.WALL) {
    // Do nothing, illegal state.
    console.log("Illegal state: Adding path unit to a wall tile.");
  } else {
    // Assume has pathUnitsQueues field.
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      // Add unit to the right queue
      if (pathUnitsQueue.pathId === pathId) {
	pathUnitsQueue.unitsQueue.push(unit);
	break;
      }
    }

    if (tile.tag == TILE_TYPE.FOOD_STORAGE && unit.isCarryingFood) {
      tile.foodStored++;
      unit.isCarryingFood = false;
    }
  }
}

function _unitEquals(unit1, unit2) {
  return unit1.energy === unit2.energy && unit1.pathId === unit2.pathId &&
    unit1.indexInPath === unit2.indexInPath && unit1.direction === unit2.direction &&
    unit1.isCarryingFood === unit2.isCarryingFood;
}

// The first unit in the given queue should move forward in its path if it
// hasn't been moved.
function _onTickPathUnitsQueue(pathUnitsQueue, worldGrid, worldPaths) {
  for (let i = 0; i < pathUnitsQueue.unitsQueue.length; i++) {
    const unit = pathUnitsQueue.unitsQueue[i];
    if (!unit.hasMovedInTick) {
      _onTickUnitInFoodPath(unit, worldGrid, worldPaths);
      break;
    }
  }
}

// --------------------------------------------------------------------------------
// EGGS FUNCTIONS
// --------------------------------------------------------------------------------

function _onTickEggs(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileEggs(tile);
    }
  }
}

function _onTickTileEggs(tile) {
  // Only the capital is affected here.
  if (tile.tag === TILE_TYPE.CAPITAL) {
    // Increase all ticksPassed by one.
    // If a group's ticksPassed is >= 10, then turn them into units inside the
    // guards.
    for (let i = tile.eggTimeGroups.length - 1; i >= 0; i--) {
      // Tick egg time groups, and hatch a group into the given tile's guards if
      // enough time has passed.
      const eggTimeGroup = tile.eggTimeGroups[i];

      eggTimeGroup.ticksPassed += 1;

      if (eggTimeGroup.ticksPassed >= 10) {
	for (let i = 0; i < eggTimeGroup.eggs; i++) {
	  tile.guards.push({
	    energy: 100,
	    pathId: -1,
	    indexInPath: -1,
	    direction: DIRECTION.STATIONARY,
	    isCarryingFood: false,
	    hasMovedInTick: false,
	  });
	}

	// Remove group.
	tile.eggTimeGroups.splice(i, 1);
      }
    }
  }
}


// --------------------------------------------------------------------------------
// UTILS
// --------------------------------------------------------------------------------

// Removes the given unit from the given list of units.
function _removeUnitFromUnits(units, unitToRemove) {
  for (i = 0; i < units.length; i++) {
    if (_unitEquals(units[i], unitToRemove)) {
      units.splice(i, 1);
      return;
    }
  }
  console.log("Warning: Didn't remove anything.");
}

