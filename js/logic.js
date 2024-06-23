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

// TODO(marvin): The `paths` variable needs to be renamed to `cyclicPaths`, so
// one off and cyclic paths are not confused.

// A World is a {grid: [2D-array-of Tile], paths: [Array-of CyclicPath],
// buildTileOptions: [Array-of TileType], buildTileSelected: [One-of TileType
// Null], clickMode: ClickMode, selectedUnits: [Array-of Unit], oneOffPaths:
// [Array-of OneOffPath]}
// Represents a 2D grid of tiles, and the paths which the units traverse between
// in the grid.

// A CyclicPath is a {orderedPoss: [Array-of Pos], lastIndex: Integer}
// Represents an ordered list of positions from source to destination which
// units traverse, and the lastIndex ought to be the length of the orderedPoss
// minus one. The Pos corresponds to the row and column of the world
// grid. Assume that the length of orderedPoss is at least two.

// A OneOffPath is a {orderedPoss: [Array-of Pos], numFollowers: Integer}
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

// A Unit is a {energy: Integer, affiliation: Affiliation, pathId: Integer,
// indexInPath: Integer, oneOffPath: [U OneOffPath false], direction: Direction, isCarryingFood: Boolean,
// hasMovedInTick: Boolean, isSelected: Boolean, pos: Pos }
// Represents a unit that is moving to a particular direction or not moving, and
// may or may not be carrying food. pathId and indexInPath are both -1 if the
// unit is not associated with any paths. The pos must be initialized along with
// the unit's position in the world grid, and continue to remain in sync.

const UNIT_PREFAB = {
  energy: 100,
  affiliation: AFFILIATION.YOURS,
  pathId: null,
  indexInPath: 0,
  oneOffPath: false,
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

// A PathUnitsQueue is a {pathId: Integer, unitsQueue: [Queue-of Units]}
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


// --------------------------------------------------------------------------------
// INITIAL STATE
// --------------------------------------------------------------------------------
const wall = {...WALL_PREFAB};
const emptyWalkableTile = _.cloneDeep(WALKABLE_TILE_PREFAB);
const paths0 =  [{
  orderedPoss: [
    {r: 1, c: 1},
    {r: 1, c: 2},
    {r: 2, c: 2},
    {r: 3, c: 2},
  ],
  lastIndex: 3,
}, {
  orderedPoss: [
    {r: 2, c: 3},
    {r: 2, c: 2},
    {r: 1, c: 2},
    {r: 0, c: 2},
  ],
  lastIndex: 3,
}];
const foodFarmUnit = {
  energy: 100,
  affiliation: AFFILIATION.YOURS,
  pathId: 0,
  indexInPath: 0,
  oneOffPath: false,
  direction: DIRECTION.TO,
  isCarryingFood: false,
  hasMovedInTick: false,
  isSelected: false,
};
const foodStorageUnit = {
  ...foodFarmUnit,
  direction: DIRECTION.FROM,
  indexInPath: 3,
};
const fsUnit1 = _.cloneDeep(foodStorageUnit);
const fsUnit2 = _.cloneDeep(foodStorageUnit);
const fsUnit3 = _.cloneDeep(foodStorageUnit);
const fsUnit4 = _.cloneDeep(foodStorageUnit);

const foodStorage = {
  ..._.cloneDeep(FOOD_STORAGE_PREFAB),
  foodStored: 10,
  pathUnitsQueues: [{pathId: 0, unitsQueue: []}],
};
const unit1 = _.cloneDeep(foodFarmUnit);
const unit2 = _.cloneDeep(foodFarmUnit);
const unit3 = _.cloneDeep(foodFarmUnit);
const unit4 = _.cloneDeep(foodFarmUnit);
const foodFarm = {
  ..._.cloneDeep(FOOD_FARM_PREFAB),
  pathUnitsQueues: [{pathId: 0, unitsQueue: [unit1, unit2, unit3, unit4]}],
};
foodFarm.society.set(ROLE.FARMER, {
  capacity: 20,
  units: [_.cloneDeep(foodFarmUnit), _.cloneDeep(foodFarmUnit), _.cloneDeep(foodFarmUnit), _.cloneDeep(foodFarmUnit)],
});
foodFarm.society.set(ROLE.SOLDIER, {
  capacity: 20,
  units: [_.cloneDeep(foodFarmUnit), _.cloneDeep(foodFarmUnit), ],
});
const singleUnit = {
  energy: 100,
  affiliation: AFFILIATION.YOURS,
  pathId: 0,
  indexInPath: 1,
  oneOffPath: false,
  direction: DIRECTION.FROM,
  isCarryingFood: false,
  hasMovedInTick: false,
  isSelected: false,
};
const singleUnit2 = {...singleUnit, indexInPath: 2};
const capital = {
  ..._.cloneDeep(CAPITAL_PREFAB),
  tag: TILE_TYPE.CAPITAL,
  isQueenAlive: true,
  eggTimeGroups: [{ticksPassed: 2, eggs: 5}, {ticksPassed: 5, eggs: 10}],
  foodStored: 1000,
  pathUnitsQueues: [],
};
const enemyUnit1 = {...singleUnit, affiliation: AFFILIATION.ENEMY, indexInPath: 0, direction: DIRECTION.TO};
const enemyUnit2 = _.cloneDeep(enemyUnit1);
const enemyCamp = {
  ..._.cloneDeep(ENEMY_CAMP_PREFAB),
  tag: TILE_TYPE.ENEMY_CAMP,
  enemyUnits: [enemyUnit1],
  foodStored: 1000,
  pathUnitsQueues: [{pathId: 1, unitsQueue: [enemyUnit2]}],
};

const buildTileOptions0 = [
  TILE_TYPE.WALL,
  TILE_TYPE.WALKABLE_TILE,
  TILE_TYPE.FOOD_STORAGE,
  TILE_TYPE.FOOD_FARM,
];

const walkableTile1 = _.cloneDeep(WALKABLE_TILE_PREFAB);
const walkableTile2 = _.cloneDeep(WALKABLE_TILE_PREFAB);

const initialWorldOld = {
  grid: [
    [wall, wall, capital, wall],
    [wall, foodFarm, walkableTile1, wall],
    [wall, wall, walkableTile2, wall],
    [wall, wall, foodStorage, wall],
  ],
  paths: paths0,
  oneOffPaths: [],
  buildTileOptions: buildTileOptions0,
  buildTileSelected: null,
  clickMode: CLICK_MODE.INFO,
  selectedUnits: [],
}

// WORLD BUILDER (MORE CONVENIENT)

// TODO(marvin):
// However, currently has no way of adding paths. I can do that after reworking
// the path system so that the one off and cyclic paths aren't weird.

// Uses TILE_TYPE. For convenience, we write down integers instead of
// TILE_TYPE.X.
// The length of initialTileTypes must be a multiple of initialTileTypesRowLength.
const initialTileTypesRowLength = 5;  // Number of columns.
const initialTileTypes = [
  1, 1, 1, 1, 1,
  1, 1, 5, 1, 1,
  1, 1, 2, 1, 1,
  1, 1, 2, 1, 1,
  1, 1, 2, 1, 1,
  4, 2, 2, 2, 3,
  1, 1, 6, 1, 1,
];

if (initialTileTypes.length % initialTileTypesRowLength != 0) {
  console.error("The length of initialTileTypes must be a multiple of initialTileTypesRowLength.");
}

// Must follow the form [Nat, Nat, [Role, Nat, ...], ...]
// which corresponds to [row position, col position, [role, number of units in
// that row, ...], ...]
// Note that row and col position counts from 0. Row counts from top to bottom,
// and col counts from left to right.
const initialPosToSociety = [
  5, 0, [ROLE.SOLDIER, 5],
  // 5, 4, [ROLE.SOLDIER, 15, ROLE.ATTACKER, 2],
  // 1, 2, [ROLE.SOLDIER, 10, ROLE.ATTACKER, 2],
  // 6, 2, [ROLE.SOLDIER, 5, ROLE.ATTACKER, 15],
  // 3, 2, [ROLE.WALKER, 1, ROLE.ATTACKER, 1],
  // 3, 2, [ROLE.WALKER, 1, ROLE.ATTACKER, 1],
];

if (initialPosToSociety.length % 3 != 0) {
  console.error("initialPosToSociety should have a length that is a multiple of 3");
}

// [2D-Arrayof Tile], [Flat-Listof Nat Nat [Flat-Listof Role Nat]] -> Void
// The given society takes a special form (assume that is true), one that is more convenient for
// writing out, but we will have to parse to its canonical form. The given tiles
// is mutated directly, and the tiles are returned again for compositionality.
function _addSocietyToInitialTiles(tiles, society) {
  let currItem = [];
  let currItemLength = 0;

  for (const societyElement of society) {
    currItem.push(societyElement);
    currItemLength++;

    if (currItemLength >= 3) {
      // currItem should have the form [Nat, Nat, [Role, Nat, ...]]
      const r = currItem[0];
      const c = currItem[1];
      const rolesCounts = currItem[2];

      const tileToModify = tiles[r][c];
      _addSocietyToTile(tileToModify, rolesCounts);

      currItem = []
      currItemLength = 0;
    }
  }
  
  return tiles;

  // Tile, [Role, Nat, ...] -> Void
  // Mutates the given tile with the rolesCounts.
  function _addSocietyToTile(tile, rolesCounts) {
    let currItem = [];
    let currItemLength = 0;

    for (const rolesCountsItem of rolesCounts) {
      currItem.push(rolesCountsItem);
      currItemLength++;

      if (currItemLength >= 2) {
	const role = currItem[0];
	const count = currItem[1];

	const societyRole = tile.society.get(role);
	for (let c = 0; c < count; c++) {
	  const unitToAdd = _.cloneDeep(UNIT_PREFAB);
	  unitToAdd.role = role;
	  societyRole.units.push(unitToAdd);
	}

	currItem = [];
	currItemLength = 0;
      }
    }

    if (currItemLength > 0) {
      console.error("rolesCounts is not well-formed, it should have length divisible by 2.");
    }
  }
}

// [Listof TileType] -> [2D-Arrayof Tile]
function _initialTileTypesToTiles(tileTypes) {
  let rv = [];
  let currRow = [];
  let currRowLength = 0;
  
  for (const tileType of tileTypes) {
    currRow.push(_tileTypeToDefaultTile(tileType));
    currRowLength++;
    
    if (currRowLength >= initialTileTypesRowLength) {
      rv.push(currRow);
      currRow = [];  // Assign to new object, not mutate.
      currRowLength = 0;
    }
  }

  return rv;

  // TileType -> Tile
  // Given a tile type, returns its corresponding tile which is a cloned object
  // of its prefab.
  function _tileTypeToDefaultTile(tileType) {
    return _.cloneDeep(_tileTypeToPrefab(tileType));

    // Returns the corresponding prefab of the given tile type, serves as a helper
    function _tileTypeToPrefab(tileType) {
      switch (tileType) {
      case TILE_TYPE.UNASSIGNED:
	console.error("Cannot use TILE_TYPE.UNASSIGNED in world builder, using TILE_TYPE.WALL instead.");
	return WALL_PREFAB;
      case TILE_TYPE.WALL:
	return WALL_PREFAB;
      case TILE_TYPE.WALKABLE_TILE:
	return WALKABLE_TILE_PREFAB;
      case TILE_TYPE.FOOD_STORAGE:
	return FOOD_STORAGE_PREFAB;
      case TILE_TYPE.FOOD_FARM:
	return FOOD_FARM_PREFAB;
      case TILE_TYPE.CAPITAL:
	return CAPITAL_PREFAB;
      case TILE_TYPE.ENEMY_CAMP:
	return ENEMY_CAMP_PREFAB;
      }
    }
  }

  
}

const initialWorld = {
  grid: _addSocietyToInitialTiles(_initialTileTypesToTiles(initialTileTypes), initialPosToSociety),
  paths: [],
  oneOffPaths: [],
  buildTileOptions: buildTileOptions0,
  buildTileSelected: null,
  clickMode: CLICK_MODE.INFO,
  selectedUnits: [],
}

// --------------------------------------------------------------------------------
// WORLD STATE
// --------------------------------------------------------------------------------
var world = initialWorld;

// ================================================================================
// FUNCTIONS
// ================================================================================

let count = 0;

function onTick() {
  _updateUnitPos(world);  // Very safe at the cost of performance
  _onTickUnitsEatAndDecay(world);
  _onTickBattles(world);
  _onTickPaths(world);
  _onTickEggs(world);
  _onTickPurgeUnfollowedPaths(world);
}

// Currently works with oneOff paths only.
function _onTickPurgeUnfollowedPaths(world) {
  // Can't use for...of because mutating the array.
  for (let i = world.oneOffPaths.length - 1; i >= 0; i--) {
    const currOneOffPath = world.oneOffPaths[i];
    if (currOneOffPath.numFollowers <= 0) {
      world.oneOffPaths.splice(i, 1);
    }
  }
}

function selectBuildTile(tileType) {
  world.buildTileSelected = tileType;
}

function selectMapTile(r, c) {
  world.mapTileSelected = world.grid[r][c];
}

function selectUnit(unit) {
  unit.isSelected = true;
  world.selectedUnits.push(unit);
}

function clearSelectedUnits() {
  for (const selectedUnit of world.selectedUnits) {
    selectedUnit.isSelected = false;
  }

  world.selectedUnits = [];
}

function changeClickMode(clickMode) {
  world.clickMode = clickMode;
}

// Changes the map tile in the given position row r and column c, to the given
// tile type.
function changeMapTile(r, c, tileType) {
  // If the tile contains units, they will just disappear.
  // TODO(ID: 1): Kill units inside tiles that get destroyed. Do this when the kill
  // code is written.
  switch (tileType) {
  case TILE_TYPE.WALL:
    // NOTE(marvin):
    // Not exactly sure if players should be able to do this... We can play it
    // by ear, and remove it as an option if it doesn't work out.
    world.grid[r][c] = {tag: tileType};
    break;
  case TILE_TYPE.WALKABLE_TILE:
    // NOTE(marvin):
    // Not exactly sure if players should be able to do this... We can play it
    // by ear, and remove it as an option if it doesn't work out.
    world.grid[r][c] = _.cloneDeep(WALKABLE_TILE_PREFAB);
    break;
  case TILE_TYPE.FOOD_STORAGE:
    world.grid[r][c] = _.cloneDeep(FOOD_STORAGE_PREFAB);
    break;
  case TILE_TYPE.FOOD_FARM:
    world.grid[r][c] = _.cloneDeep(FOOD_FARM_PREFAB);
    break;
  case TILE_TYPE.CAPITAL:
    console.log("Players shouldn't have access to building the capital.");
    break;
  case TILE_TYPE.ENEMY_CAMP:
    console.log("Players shouldn't have access to building the enemy camp.");
    break;
  default:
    console.log("Unrecognized tile type:", tileType);
  }
}

// Nat Nat -> Void
// Sends the selected units off a to a one-off path to the given map position
// row r and column c. Updates the world data definition only.
function directSelectedUnitsToOneOffPath(r, c) {
  // Generating all the needed oneOffPaths, and also set each unit's initial
  // pathIndex to 0.

  // NOTE(marvin): It's possible that one path is a subset of another path. We
  // ignore such a case for now.
  
  // Pos -> [Array-of CyclicPath]
  let oneOffPaths = new Map();

  for (const unit of world.selectedUnits) {
    if (oneOffPaths.has(unit.pos)) {
      oneOffPaths.get(unit.pos).numFollowers++;
    } else {
      oneOffPaths.set(unit.pos, {
	orderedPoss: _generatePathOrderedPoss(world.grid, unit.pos.r, unit.pos.c, r, c),
	numFollowers: 1,
      });
    }

    unit.indexInPath = 0;
    unit.oneOffPath = oneOffPaths.get(unit.pos);
    unit.pathId = null;
    unit.direction = DIRECTION.TO;
  }

  // Add generated oneOffPaths to the world.oneOffPaths. If a oneOffPath already
  // exists, then add the new number of units to that oneOffPaths.
  for (const [pos, path] of oneOffPaths) {
    _addOneOffPath(world, pos, {r: r, c: c}, path);
  }
}

function _addOneOffPath(world, fromPos, toPos, newOneOffPath) {
  // An existing oneOffPath can be identified by having the same fromPos and
  // toPos (the path-finding algorithm is deterministic).
  for (const oneOffPath of world.oneOffPaths) {
    const currFromPos = oneOffPath.orderedPoss[0];
    const currToPos = oneOffPath.orderedPoss[oneOffPath.orderedPoss.length - 1];

    if (fromPos.r === currFromPos.r && fromPos.c === currFromPos.c &&
        toPos.r === currToPos.r && toPos.c === currToPos.c) {
      oneOffPath.numFollowers += newOneOffPath.numFollowers;
      return;
    }
  }

  world.oneOffPaths.push(newOneOffPath);
}

// [2D-array-of Tile], Nat, Nat, Nat, Nat -> [Array-of Pos]
// Generates an ordered array of positions that goes from (and includes)
// position (r1, c1) to position (r2, c2) in the given grid. The first and last
// element of the positions can be anything but walls, and the positions in
// between must correspond to walkable tiles.
// IWASHERE: Understand A* from that book. The websites are horrible.
function _generatePathOrderedPoss(grid, r1, c1, r2, c2) {
  // A* search algorithm.
  
  // openList, represents the frontier, nodes we have identified but have not
  // yet expanded, initialized as the node with position (r1, c1). For each step
  // in the algorithm, we take the node with the lowest f (cost from initial
  // node to that node, plus the cost from that node to the goal node using the
  // manhattan distance heuristic). We then expand that node (we call it q),
  // adding its successors to the openList. If we have already expanded the
  // successor (which we keep track of with the closedList), then we can just
  // ignore that successor. If the successor is already in the openList, we
  // should lower its f value if the new f value is lower (I explained that bad,
  // sorry). If the successor has never been seen before, we can just add to the
  // openList.

  // This algorithm terminates when the goal node is found, in which case the
  // path is returned, or when there are no more nodes in the frontier and the
  // goal node is not found, in which case log and error. (This function
  // operates with the assumption then the goal node is reachable.)

  // This functions adds extra information on a node on top of (r, c). It adds
  // the f value, the g value (cost to get there, this depends on the parent, so
  // we might as well save this value), and the parent node.

  // The reason why we need the parent node is so that by the time we have
  // reached the goal node, we have a chain of parents leading to the initial
  // node. In other words, the parent node allows us to recover the path from
  // all the searching.

  // All the extra information can be forgotten when we return the path of nodes.

  // An ASNode is a (Nat, Nat, Nat, Nat, [U ASNode False])
  // Represents (row position, column position, g value, f value, parent node if
  // it exists).

  // Implementation from:
  // https://www.geeksforgeeks.org/a-search-algorithm/
  // However, the goal check is moved to when the node is expanded instead of
  // when looking through the successors. It hardly matters, but this is just in
  // case there is actually a better path to the goal. Also, the moment a node
  // is expanded, it is added to the closedList. 
  
  // [Array-of ASNode]
  let openList = [{r: r1, c: c1, g: 0, f: _getH(r2, c2, r1, c1), parent: false}];
  let closedList = [];

  while (openList.length > 0) {
    const qIndex = _getIndexWithSmallestF(openList);
    const q = openList[qIndex];

    // We found the goal node.
    if (q.r === r2 && q.c === c2) {
      // Unwind the parent nodes until we reach the initial position.
      let reversedRv = [];
      let currNode = q;
      while (currNode !== false) {
	reversedRv.push({ r: currNode.r, c: currNode.c});
	currNode = currNode.parent;
      }

      return reversedRv.reverse();
    }
      
    openList.splice(qIndex, 1);  // Remove q from openList.
    closedList.push(q);

    const validSuccessors = _getSuccessors(grid, q, r2, c2);

    for (const successor of validSuccessors) {
      successor.g = q.g + 1;
      successor.h = _getH(r2, c2, successor.r, successor.c);
      successor.f = successor.g + successor.h;
      successor.parent = q;

      const samePosFInOpenListIndex = _getSamePosNodeIndex(openList, successor);
      const samePosFInClosedListIndex = _getSamePosNodeIndex(closedList, successor);

      if (samePosFInClosedListIndex && closedList[samePosFInClosedListIndex].f < successor.f) {
	// If there is an easier way to get to the successor, then we shouldn't
	// add the successor to the openList and we the successor's parent
	// should remain the same.
      } else if (samePosFInClosedListIndex && closedList[samePosFInClosedListIndex].f >= successor.f) {
	// This case should be impossible given a rectangular grid. If it
	// is... well... I probably should have used a different source.  -Marvin
	console.error("Impossible case in A* search");
	
      } else if (samePosFInOpenListIndex && openList[samePosFInOpenListIndex].f < successor.f) {
	// If the openList already contains the successor with a better way of
	// getting to it, then we shouldn't change that.
      } else if (samePosFInOpenListIndex && openList[samePosFInOpenListIndex].f >= successor.f) {
	// If there is a better way of getting to a node in the frontier, then
	// we should update that node.
	openList[samePosFInOpenListIndex] = successor;
      } else {
	// Not in either lists
	openList.push(successor);
      }
    }
  }

  console.error(`A Star search algorithm unable to find a path from (${r1}, ${c1}) to (${r2}, ${c2})`);

  function _getH(ra, ca, rb, cb) {
    // Manhattan distance strategy.
    return Math.abs(ra - rb) + Math.abs(ca - cb);
  }

  // [Array-of {r, c, f, g}] -> Nat
  // Returns the index in the open list with the smallest f value. Assume that
  // the given list has at least one item.
  function _getIndexWithSmallestF(openList0) {
    let currSmallestF = Infinity;
    let currIndexWithSmallestF;

    for (let i = 0; i < openList0.length; i++) {
      const rcfg = openList0[i];
      
      if (rcfg.f < currSmallestF) {
	currSmallestF = rcfg.f;
	currIndexWithSmallestF = i;
      }
    }

    return currIndexWithSmallestF;
  }

  // [2D-array-of Tile] {r, c, f, g} Nat Nat -> [Array-of {r, c}]
  // Gets the successors of the given position (with f) q0 in the given grid,
  // where row r and column c is the position of the destination tile.
  function _getSuccessors(grid0, q0, r, c) {
    // A valid successor is one that is one manhattan distance unit away from
    // the position of q0, and is within the bounds of the grid, and is either a
    // walkable tile or the destination tile (the destination tile is assumed to
    // be legal).
    const totalNeighbours = [
      {r: q0.r - 1, c: q0.c},
      {r: q0.r + 1, c: q0.c},
      {r: q0.r, c: q0.c - 1},
      {r: q0.r, c: q0.c + 1},
    ];

    const validSuccessors = totalNeighbours.filter((pos) => {
      return (pos.r >= 0 && pos.r < grid0.length &&
	      pos.c >= 0 && pos.c < grid0[pos.r].length &&
	      grid0[pos.r][pos.c].tag === TILE_TYPE.WALKABLE_TILE) ||
	(pos.r === r && pos.c === c);
    });

    return validSuccessors;
  }

  // [Array-of {r, c, f, g}] {r, c, f, g} -> [U Nat #f]
  // Gets the f value of the position that is the same position as the given
  // successor if it exists, otherwise returns false.
  function _getSamePosNodeIndex(lst, successor0) {
    for (let i = 0; i < lst.length; i++) {
      const asnode = lst[i];
      if (asnode.r === successor0.r && asnode.c === successor0.c) {
	return i;
      }
    }

    return false;
  }
}

// Keeps the unit's pos field in sync with its actual position in the world
// grid.
function _updateUnitPos(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _updateUnitPosInTile(tile, r, c);
    }
  }
}

function _updateUnitPosInTile(tile, r, c) {
  for (const [role, {units}] of tile.society) {
    for (const unit of units) {
      unit.pos = {r: r, c: c};
    }
  }

  if (tile.hasOwnProperty('pathUnitsQueues')) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      for (const unit of pathUnitsQueue.unitsQueue) {
	unit.pos = {r: r, c: c};
      }
    }
  }
  
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
  // TODO(marvin): Go through all units with negative energy/marked for clean up
  // and remove them from the world.


  // Decay without feeding.
  for (const [role, {units}] of tile.society) {
    for (const unit of units) {
      unit.energy--;
    }
  }

  
  if (tile.tag === TILE_TYPE.FOOD_FARM) {
    // Food farm should restore food first.
    tile.foodStored += 50;
  }

  // TODO(marvin): Feed the queen.
  tile.feedAllUnitsButAttackers();
  
  

  // NOTE(marvin): Some kind of runtime polymorphism. As far as I am aware,
  // there is no better way of doing this in javascript. What would be really
  // nice is that I can assign properties/traits (not referring to programming
  // terminolgy here, just in general) to the tiles. For example, food farm and
  // food storage would have the "valid endpoint for a cyclic path"
  // property. And there would be a way to define a polymorphic function for
  // tiles with that property such that I can call the function on any given
  // tile, and if it has that property, the special code for that tile would
  // run. This is something akin to Clojure's multimethods, except that multiple
  // of those methods can be invoked with a single function application.
  if (tile.hasOwnProperty('pathUnitsQueues')) {
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
function _onTickPaths(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];
 
      _onTickTileInPaths(tile, world.grid, world.paths);
    }
  }

  // Resetting the unit.hasMovedInTick flag for all units in World
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      // Reset units in tile
      if (tile.tag == TILE_TYPE.WALKABLE_TILE) {
	for (const unit of tile.society.get(ROLE.WALKER).units) {
	  unit.hasMovedInTick = false;
	}
      } else if (tile.tag == TILE_TYPE.WALL) {
	// Do nothing.
      } else {
	if (tile.hasOwnProperty("pathUnitsQueues")) {
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
}

function _onTickTileInPaths(tile, worldGrid, worldPaths) {
  if (tile.tag == TILE_TYPE.WALKABLE_TILE) {
    // Cannot use for...of loop because array will be modified.
    const units = tile.society.get(ROLE.WALKER).units;
    for (let i = units.length - 1; i >= 0; i--) {
      _onTickUnitInPaths(units[i], worldGrid, worldPaths);
    }
  }

  for (const [role, {units}] of tile.society) {
    for (const unit of units) {
      _onTickUnitInPaths(unit, worldGrid, worldPaths);
    }
  }

  if (tile.hasOwnProperty("pathUnitsQueues")) {
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
function _onTickUnitInPaths(unit, worldGrid, worldPaths) {
  // Moves the given unit one step forward in the given path from its given index
  // with the given direction, if it is moving.
  if (unit.hasMovedInTick) {
    return;
  }

  // TODO: pathId being null is just a quick and easy way to get units in
  // walkable tiles that aren't moving... Though it doesn't really make sense
  // why units with the role "walker" aren't walking. There's got to be a better
  // way to model them.
  if (!(unit.oneOffPath) && unit.pathId == null) {
    return;
  }

  // TODO(marvin): The code currently makes a distinction between oneOffPath and
  // cyclic path, and it doesn't help that the data structures between the two
  // are so different. Strive to make them the same. `oneOffPath` is more
  // correct. For now, if statements are in place to differentiate between the
  // two cases. If a unit is in both a oneOffPath and cyclicPath, oneOffPath
  // takes precedences.

  const isOneOffPath = unit.oneOffPath;
  const path = isOneOffPath ? unit.oneOffPath : worldPaths[unit.pathId];

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

  if (isOneOffPath) {
    _removePathUnitFromTile_OneOff(tileToMoveFrom, unit, unit.oneOffPath);
    _addPathUnitToTile_OneOff(tileToMoveTo, unit, unit.oneOffPath);
  } else {
    _removePathUnitFromTile(tileToMoveFrom, unit, unit.pathId);
    _addPathUnitToTile(tileToMoveTo, unit, unit.pathId);    
  }

  unit.pos = posToMoveTo;

  // Update unit's fields.
  unit.indexInPath = newIndexInPath;

  if (isOneOffPath) {
    if (unit.indexInPath === path.lastIndex) {
      // One off paths with no followers will be purged on a different pass.
      unit.oneOffPath.numFollowers--;
      unit.oneOffPath = false;
    }
  } else {
    // Change unit's direction if arrive at either end of the path.
    if (unit.indexInPath === path.lastIndex) {
      unit.direction = DIRECTION.FROM;
    } else if (unit.indexInPath === 0) {
      unit.direction = DIRECTION.TO;
    }
  }

  unit.hasMovedInTick = true;
}

function _removePathUnitFromTile_OneOff(tile, unit) {
  // Cases
  // - Unit leaving from origin tile.
  //   - If in cyclic path, remove from path in units queue.
  //   - If any other role, just remove from the unit's role.
  // - Unit leaving from in-between tiles.
  //   - Remove from walker role.

  // Unit's role is what its role is in every situation except in a cyclic path
  // waiting at an endpoint, in which case, it should have ROLE.WALKER, but it
  // is not in the society map's ROLE.WALKER. This is not a good idea, but we
  // can fix this later.

  
  if (unit.pathId && tile.tag !== TILE_TYPE.WALKABLE_TILE) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      // Remove the given unit from the given pathUnitsQueue of the given pathId.
      if (pathUnitsQueue.pathId == pathId) {
	_removeUnitFromUnits(pathUnitsQueue.unitsQueue, unit);
	break;
      }
    }
  } else {
    _removeUnitFromUnits(tile.society.get(unit.role).units, unit);
  }
}

// (Tile, Unit, Integer): Void
// Removes the given unit on the given path ID from the given tile, if it
// exists, taking food with the unit if the given tile is a food farm.
function _removePathUnitFromTile(tile, unit, pathId) {
  if (tile.tag == TILE_TYPE.WALKABLE_TILE) {
    _removeUnitFromUnits(tile.society.get(ROLE.WALKER).units, unit);
  } else if (tile.tag == TILE_TYPE.WALL) {
    // Do nothing.
    console.log("Illegal state: Removing path unit from a wall tile.");
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
  } else if (tile.tag == TILE_TYPE.ENEMY_CAMP) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      // Remove the given unit from the given pathUnitsQueue of the given pathId.
      if (pathUnitsQueue.pathId == pathId) {
	_removeUnitFromUnits(pathUnitsQueue.unitsQueue, unit);
	break;
      }
    }
  }
}

function _addPathUnitToTile_OneOff(tile, unit) {
  if (tile.tag == TILE_TYPE.WALKABLE_TILE) {
    const tileUnits = tile.society.get(ROLE.WALKER).units;
    tileUnits.push(unit);
    unit.role = ROLE.WALKER;
  } else if (tile.tag == TILE_TYPE.WALL) {
    // Do nothing, illegal state.
    console.log("Illegal state: Adding path unit to a wall tile.");
  } else {
    if (tile.tag == TILE_TYPE.CAPITAL && unit.affiliation == AFFILIATION.ENEMY) {
      tile.society.get(ROLE.ATTACKER).units.push(unit);
      unit.role = ROLE.ATTACKER;
    } else {
      // Entering the endpoint tile. As of now, players cannot choose which role
      // the unit will be in, so we just pick one based on a priority.

      _getSocietyRoleUnitsToJoin(tile).push(unit);
      unit.role = ROLE.WALKER;

      if (tile.tag == TILE_TYPE.FOOD_STORAGE && unit.isCarryingFood) {
	tile.foodStored++;
	unit.isCarryingFood = false;
      }
    }
    
  }
}

// Tile -> [Arrayof Unit]
function _getSocietyRoleUnitsToJoin(tile) {
  const societyRolesPriority = [
    ROLE.FARMER,
    ROLE.SOLDIER,
    ROLE.WALKER,
    ROLE.QUEEN,
  ];

  for (const role of societyRolesPriority) {
    if (tile.society.has(role)) {
      return tile.society.get(role).units;
    }
  }

  console.error("Tile did not have a role it could give.");
}

// (Tile, Unit, Integer): Void
// Adds the given unit in a path to the given tile with the given path ID.
function _addPathUnitToTile(tile, unit, pathId) {
  if (tile.tag == TILE_TYPE.WALKABLE_TILE) {
    const tileUnits = tile.society.get(ROLE.WALKER).units;
    tileUnits.push(unit);
    unit.role = ROLE.WALKER;
  } else if (tile.tag == TILE_TYPE.WALL) {
    // Do nothing, illegal state.
    console.log("Illegal state: Adding path unit to a wall tile.");
  } else {
    // If enemy entering capital, then the enemy should not be added to the
    // pathUnitsQueues, but instead the enemyUnits
    if (tile.tag == TILE_TYPE.CAPITAL && unit.affiliation == AFFILIATION.ENEMY) {
      tile.society.get(ROLE.ATTACKER).units.push(unit);
      unit.role = ROLE.ATTACKER;
    } else {
      if (tile.hasOwnProperty("pathUnitsQueues")) {
	for (const pathUnitsQueue of tile.pathUnitsQueues) {
	  // Add unit to the right queue
	  if (pathUnitsQueue.pathId === pathId) {
	    pathUnitsQueue.unitsQueue.push(unit);
	    unit.role = ROLE.WALKER;
	    break;
	  }
	}

	if (tile.tag == TILE_TYPE.FOOD_STORAGE && unit.isCarryingFood) {
	  tile.foodStored++;
	  unit.isCarryingFood = false;
	}	
      }
      
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
      _onTickUnitInPaths(unit, worldGrid, worldPaths);
      break;
    }
  }
}

// --------------------------------------------------------------------------------
// BATTLE FUNCTIONS
// --------------------------------------------------------------------------------

function _onTickBattles(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileBattles(tile);
    }
  }
}

function _onTickTileBattles(tile) {
  // For now, battles only occur in walkable tiles and the capital.
  if (tile.tag === TILE_TYPE.WALKABLE_TILE) {
    let yourUnits = tile.society.get(ROLE.WALKER);
    let enemyUnits = tile.society.get(ROLE.ATTACKER);

    const numBattles = Math.min(yourUnits.length, enemyUnits.length);

    yourUnits.length -= numBattles;
    enemyUnits.length -= numBattles;
  } else if (tile.tag === TILE_TYPE.CAPITAL) {
    // For now, only guards are used in battle. Potentially can use units in
    // queue.
    const guards = tile.society.get(ROLE.SOLDIER).units;
    const enemies = tile.society.get(ROLE.ATTACKER).units;
    while (guards.length > 0 && enemies.length > 0) {
      guards.pop();
      enemies.pop();
    }

    if (enemies.length > guards.length) {
      tile.isQueenAlive = false;
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
	  tile.society.get(ROLE.SOLDIER).units.push({
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

// _getUnitsWithRole : Tile Role -> [List-of Unit]
// Returns the units of the given role in the given tile.
function _getUnitsWithRole(tile, role) {
  return tile.society.get(role).units;
}

