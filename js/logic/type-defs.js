// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for the type definitions of the logic module. Note that because
// we are using Javascript, the types are not enforced by the programming
// language. They are just comments, and the comments may be wrong... so just be
// careful.

// ================================================================================
// DATA DEFINITIONS
// ================================================================================

// A World is a {grid: [2D-array-of Tile], cyclicPaths: [Array-of CyclicPath],
// buildTileOptions: [Array-of TileType], buildTileSelected: [One-of TileType
// Null], clickMode: ClickMode, selectedUnits: [Array-of Unit], oneOffPaths:
// [Array-of OneOffPath]}
// Represents a 2D grid of tiles, and the paths which the units traverse between
// in the grid.

// A PathType is one of:
// - ONE_OFF
// - CYCLIC
const PATH_TYPE = Object.freeze({
  ONE_OFF: 0,
  CYCLIC: 1,
});

// A Path is one of:
// - OneOffPath
// - CyclicPath
// Represents an origin and destination and the positions in between them for units to traverse.

// A CyclicPath is a {tag: PathType, orderedPoss: [Array-of Pos], lastIndex: Integer}
// Represents an ordered list of positions from source to destination which
// units traverse, and the lastIndex ought to be the length of the orderedPoss
// minus one. The Pos corresponds to the row and column of the world
// grid. Assume that the length of orderedPoss is at least two.

// A OneOffPath is a {tag: PathType, orderedPoss: [Array-of Pos], numFollowers:
// Integer, lastIndex: Integer}
// Represents a path that a set of units take (the nunmber of which is
// followers) to reach a destination. Ought to not exist when followers is 0.

// A Pos is a {r: Integer, c: Integer}
// Represents the position in the world's grid, where the larger r is, the more
// downward in the grid, and the larger c is, the more rightward in the grid.

// A TileType is one of the following.
// Represents the type of tile. Note that no tile on the map should have a type
// of unassigned.
// Do not simply change the numnbers of a TILE_TYPE, because the world builder
// uses integers to build the world (for convenience). If you do need to change
// the numbers, please also update the world builder initial tiles.
const TILE_TYPE = Object.freeze({
  UNASSIGNED: 0,
  WALL: 1,
  WALKABLE_TILE: 2,
  FOOD_STORAGE: 3,
  FOOD_FARM: 4,
  CAPITAL: 5,
  ENEMY_CAMP: 6,
});

// An ATile is a (tag: TileType, society: [Mapping Role (Nat, [List-of Unit])])
// All tiles are abstract tiles, with the exception of WalkableTile which is
// only an array and is guaranteed to only contain walkers.

// A Tile is one of:
// - Wall
// - WalkableTile
// - FoodStorage
// - FoodFarm
// - Capital
// - EnemyCamp
// Represents the type of tile that it is.
// NOTE(marvin): Use _.cloneDeep(...) to clone. structuredClone doesn't work
// with objects with methods.
const ATILE = {
  tag: TILE_TYPE.UNASSIGNED,  // Must be replaced by derived tile
  society: new Map(),         // Must be replaced by derived tile

  feedAllUnitsButAttackers: function () {
    // Does nothing by default.
  }
};

const foodStorageMixin = {
  foodStored: 0,
  
  feedAllUnitsButAttackers: function () {
    for (const [role, {units}] of this.society) {
      if (role === ROLE.ATTACKER) {
	continue;
      }

      this.foodStored = _feedUnits(units, this.foodStored);
    }
  }
}

// TODO(marvin): Remove all uses of hasOwnProperty("pathUnitsQueues") and
// replace with this mixin. Unlike foodStorageMixin, there's a lot more going
// on.  The intersection with foodStorageMixin is interesting...
const cyclicEndPointMixin = {
  
}
/*
  REFERENCE
if (tile.hasOwnProperty('pathUnitsQueues')) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      tile.foodStored = _feedUnits(pathUnitsQueue.unitsQueue, tile.foodStored);
    }
  }

if (tile.hasOwnProperty("pathUnitsQueues")) {
	  for (const pathUnitsQueue of tile.pathUnitsQueues) {
	    // Resetting the unit.hasMovedInTick flag for PathUnitsQueue
	    for (const unit of pathUnitsQueue.unitsQueue) {
	      unit.hasMovedInTick = false;
	    }
	  }
}

if (tile.hasOwnProperty("pathUnitsQueues")) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      _onTickPathUnitsQueue(pathUnitsQueue, worldGrid, worldPaths);
    }
}

if (tile.hasOwnProperty("pathUnitsQueues")) {
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
*/

// A Role is one of:
// - FARMER: 0
// - SOLDIER: 1
// - WALKER: 2
// - QUEEN: 3
// - ATTACKER: 4
// Represents a way to categorize units based on what they do.
const ROLE = Object.freeze({
  FARMER: 0,
  SOLDIER: 1,
  WALKER: 2,
  QUEEN: 3,
  ATTACKER: 4,
});

// A Wall is an ATile that has no society.
// Represents a tile type that cannot be walked into but can be replaced with
// other tile types.
// Wall prefab.
const WALL_PREFAB = {...ATILE, tag: TILE_TYPE.WALL, society: new Map()}

// A WalkableTile is an ATile with walker and attacker roles in its society.
// Represents a tile that may or may not have units traversing it.
const WALKABLE_TILE_PREFAB = {
  ...ATILE,
  tag: TILE_TYPE.WALKABLE_TILE,
  society: new Map([
    [ROLE.WALKER, {capacity: Infinity, units: []}],
    [ROLE.ATTACKER, {capacity: Infinity, units: []}],
  ])
}

// A Affiliation is one of:
// - YOURS: 0,
// - ENEMY: 1,
// Represents the type of enemy.
const AFFILIATION = Object.freeze({
  YOURS: 0,
  ENEMY: 1,
});

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

// A Unit is a {energy: Integer, affiliation: Affiliation,
// indexInPath: Integer, path: [U Path false], direction: Direction, isCarryingFood: Boolean,
// hasMovedInTick: Boolean, isSelected: Boolean, pos: Pos }
// Represents a unit that is moving to a particular direction or not moving, and
// may or may not be carrying food. pathId and indexInPath are both -1 if the
// unit is not associated with any paths. The pos must be initialized along with
// the unit's position in the world grid, and continue to remain in sync.

const UNIT_PREFAB = {
  energy: 100,
  affiliation: AFFILIATION.YOURS,
  indexInPath: 0,
  path: false,
  direction: DIRECTION.TO,
  isCarryingFood: false,
  hasMovedInTick: false,
  isSelected: false,
  role: ROLE.WALKER,
}

// A FoodStorage is a {tag: TileType, foodStored: Integer,
// pathUnitsQueues: [Array-of PathUnitsQueue]}
// Represents the amount of food contained, the society of guards, the paths it is on and
// the units waiting to be deployed on the path in order.
const FOOD_STORAGE_PREFAB = Object.assign({
  ...ATILE,
  tag: TILE_TYPE.FOOD_STORAGE,
  society: new Map([[ROLE.SOLDIER, {capacity: 20, units: []}],
		    [ROLE.ATTACKER, {capacity: 20, units: []}]]),
  pathUnitsQueues: [],
}, foodStorageMixin);

// A PathUnitsQueue is a {path: Path, unitsQueue: [Array-of Units]}
// Represents a queue of units to be deployed on the path.

// A FoodFarm is a {tag: TileType, foodStored: Integer, pathUnitsQueues:
// [Array-of PathUnitsQueue]}
// Represents the society of farmers and guards, and the food stored.
const FOOD_FARM_PREFAB = Object.assign({
  ...ATILE,
  tag: TILE_TYPE.FOOD_FARM,
  society: new Map([[ROLE.SOLDIER, {capacity: 20, units: []}],
		    [ROLE.FARMER, {capacity: 20, units: []}],
		    [ROLE.ATTACKER, {capacity: 20, units: []}]]),
  pathUnitsQueues: [],
}, foodStorageMixin);

// A Capital is a {tag: TileType, isQueenAlive: Boolean, eggTimeGroups:
// [Array-of EggTimeGroup], foodStored: Integer, pathUnitsQueues: [Array-of
// PathUnitsQueue]}
// Represents the building in which eggs are laid and hatched into units.

// TODO(capital): Finalise its design
const CAPITAL_PREFAB = {
  ...ATILE,
  tag: TILE_TYPE.CAPITAL,
  society: new Map([[ROLE.SOLDIER, {capacty: 20, units: []}],
		    [ROLE.ATTACKER, {capacity: 20, units: []}]]),
  eggTimeGroups: [{ticksPassed: 2, eggs: 5}, {ticksPassed: 5, eggs: 10}],
}

// An EggTimeGroup is a {ticksPassed: Integer, eggs: Integer}
// Represents a group of eggs that have been laid for some number of ticks.

// An EnemyCamp is a {tag: TileType, enemyUnits: [Array-of Unit],
// pathUnitsQueues: [Array-of PathUnitsQueue]}
// Represents that which holds enemies that want to walk to the capital to kill
// the queen.
// Note that soldier here refers to the player's units, and attacker refers to
// the enemy's units.
const ENEMY_CAMP_PREFAB = {
  ...ATILE,
  tag: TILE_TYPE.ENEMY_CAMP,
  society: new Map([[ROLE.SOLDIER, {capacity: 20, units: []}],
		    [ROLE.ATTACKER, {capacity: 20, units: []}]])
}

// A ClickMode is one of:
// - Info
// - Build
// - OneOffPath
// Represents what clicking means.
const CLICK_MODE = Object.freeze({
  INFO: 0,
  BUILD: 1,
  ONE_OFF_PATH: 2,
});

// ================================================================================
// FUNCTIONS
// ================================================================================

function _unitEquals(unit1, unit2) {
  return unit1.energy === unit2.energy && unit1.path === unit2.path
      unit1.indexInPath === unit2.indexInPath && unit1.direction === unit2.direction &&
      unit1.isCarryingFood === unit2.isCarryingFood;
}
