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
// The world object to be used by the main game loop.
var world = initialWorld;

// ================================================================================
// MAIN ONTICK FUNCTION
// ================================================================================

function onTick() {
  _updateUnitPos(world);  // Very safe at the cost of performance
  _onTickUnitsEatAndDecay(world);
  _onTickBattles(world);
  _onTickPaths(world);
  _onTickEggs(world);
  _onTickPurgeUnfollowedPaths(world);
  _onTickDestroyTiles(world);
}

// ================================================================================
// FEATURE FUNCTIONS
// ================================================================================

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
// tile type. If gameCommand is true, that building denied is overriden. If
// gameCommand is false, then it is a player request, which can be denied.
function changeMapTile(r, c, tileType, gameCommand = false) {
  // These local variables are responsible for making the appropriate sound
  // effect. You can see the control flow at the bottom of this function. Change
  // these booleans inside the switch case as per the rules of the game, and the
  // right SFX should just play.
  let buildingDenied = false;
  let buildingDestroyed = false;
  
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
    // Building a walkable tile is equivalent to destroying a player
    // infrastructure, so it's not going to work on enemy camps, walls and
    // walkable tiles.
    const currTileTypeToReplace = world.grid[r][c].tag;

    if (!gameCommand && (currTileTypeToReplace === TILE_TYPE.WALL ||
			 currTileTypeToReplace === TILE_TYPE.WALKABLE_TILE ||
			 currTileTypeToReplace === TILE_TYPE.ENEMY_CAMP)) {
      buildingDenied = true;
    } else {
      world.grid[r][c] = _.cloneDeep(WALKABLE_TILE_PREFAB);
      buildingDestroyed = true;
    }
    
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

  if (buildingDenied) {
    playSFX("building_denied");
  } else if (buildingDestroyed) {
    playSFX("building_destroyed");
  } else {
    playSFX("building_built");
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
      const orderedPoss = generatePathOrderedPoss(world.grid, unit.pos.r, unit.pos.c, r, c);
      oneOffPaths.set(unit.pos, {
	tag: PATH_TYPE.ONE_OFF,
	orderedPoss: orderedPoss,
	numFollowers: 1,
	lastIndex: orderedPoss.length - 1,
      });
    }

    unit.indexInPath = 0;
    unit.path = oneOffPaths.get(unit.pos);
    unit.direction = DIRECTION.TO;
  }

  // Add generated oneOffPaths to the world.oneOffPaths. If a oneOffPath already
  // exists, then add the new number of units to that oneOffPaths.
  for (const [pos, path] of oneOffPaths) {
    _addOneOffPath(world, pos, {r: r, c: c}, path);
  }
}

// Auxillary function for directSelectedUnitsToOneOffPath.
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

// --------------------------------------------------------------------------------
// UPDATE UNIT POSITIONS
// --------------------------------------------------------------------------------

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


// Tile Role Unit -> Void
// Adds the given the given unit into the given tile with the given role in its
// society. Ensures that the unit's role is in sync with the role units array it
// is in. Errors if the role in the tile doesn't exist.
function _addUnitToRole(tile, role, unit) {
  _getUnitsWithRole(tile, role).push(unit);
  unit.role = role;
}

// Removes any tiles that meet the destroy criteria
// TODO: Move to separate file/abstraction if this grows larger than enemy camps
function _onTickDestroyTiles(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];
      _onTickDestroyTile(r, c, tile);
    }
  }
}

function _onTickDestroyTile(r, c, tile) {
  if(tile.tag === TILE_TYPE.ENEMY_CAMP) {
    const hasAnyUnits = tile.society.values().some(society => society.units?.length > 0);
    if(!hasAnyUnits) {
      console.log(`All enemy units destroyed in enemy camp [${r},${c}] - changing to walkable tile`);
      // Destroy the enemy camp by changing it to a walkable tile
      changeMapTile(r, c, TILE_TYPE.WALKABLE_TILE, true);
    }
  }
}
