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
// Null], dynamiteSelected: Boolean, clickMode: ClickMode, selectedUnits:
// [Array-of Unit], selectedPath: CyclicPath, oneOffPaths: [Array-of
// OneOffPath], mapTileSelected: [U Tile False], twoEndCyclicPathFirstPos: [U
// Pos False]}
// Represents a 2D grid of tiles, and the paths which the units traverse between
// in the grid. Units that are in cyclic paths that are destroyed will have
// their cyclic paths converted to one off paths, however these one off paths
// won't appear in the oneOffPaths array. (We could do it, it's just a pain. We
// can get away with this because we don't need to observe the one off paths
// other than getting the units to move.)
// If dynamiteSelected is true, then buildTileSelected must be null.

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

// A CyclicPath is a {tag: PathType, orderedPoss: [Array-of Pos], numFollowers:
// Nat, lastIndex: Integer, destroyed: Boolean, forceDest: [U Pos False]}
// Represents an ordered list of positions from source to destination which
// units traverse, and the lastIndex ought to be the length of the orderedPoss
// minus one. The Pos corresponds to the row and column of the world
// grid. Assume that the length of orderedPoss is at least two. The destroyed
// field represents if whether the user has destroyed the path. If path is
// destroyed and forceDest is a pos, then units in the cyclic path will join a
// one off path to forceDest. If path is destroyed and forceDest is false, then
// units will go on a one off path to the end of the cyclic path they were
// already heading towards or are already there. forceDest has no effect if the
// path has not been destroyed.

// Assumes that the two given paths are cyclic. Equal when origin and
// destination of the two paths are the same.
function cyclicPathEquals(cyclicPath1, cyclicPath2) {
  if (cyclicPath1.tag != PATH_TYPE.CYCLIC ||
      cyclicPath2.tag != PATH_TYPE.CYCLIC) {
    console.error("cyclicPathEquals received one off path");
  }
  return _pathEquals(cyclicPath1, cyclicPath2);
}

// Does the given path have the following ends?
function pathHasEnds(path, origin, destination) {
  if (!path.hasOwnProperty("orderedPoss")) {
    console.error("Path does not have orderedPoss field");
  }
  
  const origin0 = path.orderedPoss[0];
  const destination0 = path.orderedPoss[path.lastIndex];
  return (
    (posEquals(origin0, origin) &&
     posEquals(destination0, destination))
      ||
      (posEquals(origin0, destination) &&
       posEquals(destination0, origin)));
}

// Assumes that the two given paths are one off. Equal when origin and
// destination of the two paths are the same.
function oneOffPathEquals(oneOffPath1, oneOffPath2) {
  if (cyclicPath1.tag != PATH_TYPE.ONE_OFF ||
      cyclicPath2.tag != PATH_TYPE.ONE_OFF) {
    console.error("oneOffPathEquals received cyclic");
  }
  return _pathEquals(oneOffPath1, oneOffPath2);
}

// Assumes that the two given paths are of the same type.
function _pathEquals(path1, path2) {
  const origin1 = path1.orderedPoss[0];
  const destination1 = path1.orderedPoss[path1.lastIndex];

  const origin2 = path2.orderedPoss[0];
  const destination2 = path2.orderedPoss[path2.lastIndex];

  return (
    (posEquals(origin1, origin2) &&
     posEquals(destination1, destination2))
      ||
      (posEquals(origin1, destination2) &&
       posEquals(destination1, origin2)));
}

// A OneOffPath is a {tag: PathType, orderedPoss: [Array-of Pos], numFollowers:
// Integer, lastIndex: Integer, destroyed: Boolean}
// Represents a path that a set of units take (the nunmber of which is
// followers) to reach a destination. Ought to not exist when followers is
// 0. Destroyed means that the path should be converted to one to the opposite
// direction (units will return to where they came from.), or if where they came
// from has also been destroyed, then go to nearest friendly tile.

// A Pos is a {r: Integer, c: Integer}
// Represents the position in the world's grid, where the larger r is, the more
// downward in the grid, and the larger c is, the more rightward in the grid.

function posEquals(pos1, pos2) {
  return pos1.r === pos2.r && pos1.c === pos2.c;
}

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
  UNDER_CONSTRUCTION: 7,
});

// used in draw.js _drawTileStats() to display tile type as a string
// TODO: turn into a fancy "map" object with TILE-TYPE keys?
const TILE_TYPE_STRING = [
  "Unassigned",
  "Wall",
  "Walkable Terrain",
  "Food Storage",
  "Farm",
  "Capital City",
  "Enemy Camp",
  "Under Construction",
];

function isFriendlyTileType(tileType) {
  switch (tileType) {
  case TILE_TYPE.FOOD_STORAGE:
  case TILE_TYPE.FOOD_FARM:
  case TILE_TYPE.CAPITAL:
  case TILE_TYPE.UNDER_CONSTRUCTION:
    return true;
  }

  return false;
}

// An ATile is a (tag: TileType, society: [Mapping Role SocietyClass])
// All tiles are abstract tiles, with the exception of WalkableTile which is
// only an array and is guaranteed to only contain walkers. The society field
// maps between role to an object that holds the capacity (how manyunits can be
// in that role?) and the list of units in that role. (TODO) The queen is not currently
// represented in the society role, and is a boolean in the Capital field. It
// really should be treated as a unit except that it cannot move and its death
// causes a game over instead of just disappearing.

// A SocietyClass is a (capacity: Nat, units: [List-of Unit])
// Represents the units in a particular class of society, as well as the maximum
// capacity that can be contained in that society.

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
// - BUILDER: 5
// Represents a way to categorize units based on what they do.
const ROLE = Object.freeze({
  FARMER: 0,
  SOLDIER: 1,
  WALKER: 2,
  QUEEN: 3,
  ATTACKER: 4,
  BUILDER: 5,
});

// An UnderConstruction is a (...ATile, constructionProgress: Nat,
// constructionGoal: Nat, resultingTile: ATile)
// Represents an ATile that contains another ATile, and only has a
// society of builders, and information on completion percentage.
const UNDER_CONSTRUCTION_PREFAB = {
  ...ATILE,
  tag: TILE_TYPE.UNDER_CONSTRUCTION,
  society: new Map([
    [ROLE.BUILDER, { capacity: Infinity, units: []}],
  ]),
  constructionProgress: 0,
  constructionGoal: 100,  // Immutable
  resultingTileType: null,  // Needs to be filled in when instantiated
};

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
// indexInPath: [U Natural false], path: [U Path false], direction: Direction, isCarryingFood: Boolean,
// hasMovedInTick: Boolean, isSelected: Boolean, pos: Pos, cyclicPathToJoin: [U
// CyclicPath false], indexInPathToJoin: [U Natural false] }
// Represents a unit that is moving to a particular direction or not moving, and
// may or may not be carrying food. pathId and indexInPath are both -1 if the
// unit is not associated with any paths. The pos must be initialized along with
// the unit's position in the world grid, and continue to remain in sync. If
// indexInPath is false but path is not false, then the unit is walking towards
// the path but they are not there yet.

const UNIT_PREFAB = {
  energy: 100,
  affiliation: AFFILIATION.YOURS,
  indexInPath: false,
  path: false,
  direction: DIRECTION.TO,
  isCarryingFood: false,
  hasMovedInTick: false,
  isSelected: false,
  role: ROLE.WALKER,
  pathToJoin: false,
  indexInPathToJoin: false,
}

// A FoodStorage is a {tag: TileType, foodStored: Integer, foodMaxCapacity:
// Integer, pathUnitsQueues: [Array-of PathUnitsQueue]}
// Represents the amount of food contained, the society of guards, the paths it is on and
// the units waiting to be deployed on the path in order.
const FOOD_STORAGE_PREFAB = Object.assign({
  ...ATILE,
  tag: TILE_TYPE.FOOD_STORAGE,
  society: new Map([[ROLE.SOLDIER, {capacity: 20, units: []}],
		    [ROLE.ATTACKER, {capacity: 20, units: []}]]),
  pathUnitsQueues: [],
  foodMaxCapacity: 15000,
}, foodStorageMixin);

// A PathUnitsQueue is a {path: Path, unitsQueue: [Array-of Units]}
// Represents a queue of units to be deployed on the path.

// A FoodFarm is a {tag: TileType, foodStored: Integer, foodMaxCapacity:
// Integer, pathUnitsQueues: [Array-of PathUnitsQueue]}
// Represents the society of farmers and guards, and the food stored.
const FOOD_FARM_PREFAB = Object.assign({
  ...ATILE,
  tag: TILE_TYPE.FOOD_FARM,
  society: new Map([[ROLE.SOLDIER, {capacity: 20, units: []}],
		    [ROLE.FARMER, {capacity: 20, units: []}],
		    [ROLE.ATTACKER, {capacity: 20, units: []}]]),
  pathUnitsQueues: [],
  foodMaxCapacity: 3000,
}, foodStorageMixin);

// A Capital is a {tag: TileType, isQueenAlive: Boolean, foodStored: Integer,
// foodMaxCapacity: Integer, numUnitsToSpawnNextCycle: Nat, ticksPassed: Nat,
// ticksPerEggCycle: Nat, pathUnitsQueues: [Array-of PathUnitsQueue]}
// Represents the building in which eggs are laid and hatched into units.

// We just make the queen here.
const QUEEN_UNIT = _.cloneDeep(UNIT_PREFAB);
QUEEN_UNIT.role = ROLE.QUEEN;

const CAPITAL_PREFAB = Object.assign({
  ...ATILE,
  tag: TILE_TYPE.CAPITAL,
  society: new Map([[ROLE.QUEEN, {capacity: 1, units: [QUEEN_UNIT]}],
                    [ROLE.SOLDIER, {capacity: 20, units: []}],
                    [ROLE.ATTACKER, {capacity: 20, units: []}],
                   ]),
  pathUnitsQueues: [],
  foodMaxCapacity: 6000,

  // Related to eggs
  numUnitsToSpawnNextCycle: 0,
  ticksPassed: 0,
  ticksPerEggCycle: 30,  // Immutable
  projectedFoodCostPerCycle: 0,  // Keep updated every game logic tick. IWASHERE,
  projectedSurplusFoodOverCostPerCyclePercentage: 0,  // Keep updated every game logic tick.
}, foodStorageMixin);

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

// A ClickMode is one of the below.
// Represents what clicking means.
const CLICK_MODE = Object.freeze({
  INFO: 0,
  BUILD: 1,
  ONE_OFF_PATH: 2,
  ONE_END_CYCLIC_PATH: 3,
  TWO_END_CYCLIC_PATH: 4,
});

// ================================================================================
// FUNCTIONS
// ================================================================================

function _unitEquals(unit1, unit2) {
  return unit1.energy === unit2.energy && unit1.path === unit2.path
      unit1.indexInPath === unit2.indexInPath && unit1.direction === unit2.direction &&
      unit1.isCarryingFood === unit2.isCarryingFood;
}
