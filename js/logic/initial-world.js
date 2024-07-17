// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for providing the world object, named `initialWorld`, which will be used as the very
// first one for the game's event loop.

// Note that this file provides two strategies. The first one is is just
// manually writing each and every object by hand, which is very verbose and
// time consuming. The second one is to use the world builder to quickly
// generate the map. Though, the world builder isn't as expressive as the first
// strategy, i.e, the world builder cannot build all the worlds that the first
// strategy can build.

// It is recommended to use the world builder to quickly generate example maps
// for testing purposes, and modifying the world builder as necessary to
// accommodate more expressive worlds. If the world you have in mind is too
// complex and enhancing the world builder won't save time, then it makes sense
// to just use the first strategy.

// To switch between the two strategies, change the world object produced by the
// strategy you want to `initialWorld`, and the world object of the other
// strategy to something else, like `initialWorldOld`.

// ================================================================================
// INITIAL WORLD BY HAND (STRATEGY ONE)
// ================================================================================
const wall = {...WALL_PREFAB};
const emptyWalkableTile = _.cloneDeep(WALKABLE_TILE_PREFAB);
const paths0 =  [{
  tag: PATH_TYPE.CYCLIC,
  orderedPoss: [
    {r: 1, c: 1},
    {r: 1, c: 2},
    {r: 2, c: 2},
    {r: 3, c: 2},
  ],
  lastIndex: 3,
}, {
  tag: PATH_TYPE.CYCLIC,
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
  cyclicPaths: paths0,
  oneOffPaths: [],
  buildTileOptions: buildTileOptions0,
  buildTileSelected: null,
  clickMode: CLICK_MODE.INFO,
  selectedUnits: [],
}

// ================================================================================
// WORLD BUILDER
// ================================================================================

// TODO(marvin):
// However, currently has no way of adding paths. I can do that after reworking
// the path system so that the one off and cyclic paths aren't weird.

// Uses TILE_TYPE. For convenience, we write down integers instead of
// TILE_TYPE.X.
// The length of initialTileTypes must be a multiple of initialTileTypesRowLength.
const initialTileTypesRowLength = 13;  // Number of columns.
const initialTileTypes = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  4, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
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
   6, 2, [ROLE.SOLDIER, 0, ROLE.ATTACKER, 2],
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
  cyclicPaths: [],
  oneOffPaths: [],
  buildTileOptions: buildTileOptions0,
  buildTileSelected: null,
  clickMode: CLICK_MODE.INFO,
  selectedUnits: [],
}
