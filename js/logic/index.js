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

  _onTickConstruction(world);
  _onTickUnitsEatAndDecay(world);
  _onTickBattles(world);
  _onTickPaths(world);
  _onTickEggs(world);
  
  _onTickPurgeUnfollowedOneOffPaths(world);
  _onTickDestroyTiles(world);
}

// ================================================================================
// WORLD->X FUNCTIONS
// ================================================================================

// World -> String
// Gets the message text to display given the current world state. Returns an
// empty string by default.
function getMessageText(w) {
  switch (w.clickMode) {
  case CLICK_MODE.INFO:
    const { mapTileSelected } = w;
    return _getTileMessageText(mapTileSelected);
  case CLICK_MODE.BUILD:
    const { buildTileSelected, dynamiteSelected } = w;
    if (dynamiteSelected) {
      return "Click on a building to instantly destroy it. Units within will leave to closest friendly tile.";
    } else {
      return "Click on a wall or friendly tiles (except the capital) adjacent to an empty tile to build it.";
    }
  case CLICK_MODE.ONE_OFF_PATH: {
    const { selectedUnits } = w;
    if (selectedUnits.length === 0) {
      return "Click on a tile, and then click and drag over the units you want to move. The selected role on the tile will be given assigned to the units, if no role is selected, the units will be randomly assigned one."
    } else {
      return "Click on a tile where you want to move the selected units to.";
    }
  }
  case CLICK_MODE.ONE_END_CYCLIC_PATH: {
    const { selectedUnits } = w;
    if (selectedUnits.length === 0) {
      return "Click on a tile, and then click and drag over the units you want to move back and forth between where the tile they are already on and another tile of your choice."
    } else {
      return "Click on another tile to get the selected units to move back and forth between the that tile and the tile they are already on.";
    }
  }
  case CLICK_MODE.TWO_END_CYCLIC_PATH: {
    const { twoEndCyclicPathFirstPos } = w;
    if (!twoEndCyclicPathFirstPos) {
      return "Click on the first of the two buildings to create a cyclic path, and any units selected will walk back and forth between them. (You may need to select units first with another mode.)"
    } else {
      return "Click on the second of the two bulidings to create a cyclic path, and any units selected will walk back and forth between them."
    }
    return "";
  }
  }

  return "";
}

// [U Tile False] -> String
// Gets the message text to display given the selected map tile. Returns an
// empty string by default.
function _getTileMessageText(tile) {
  if (!tile) {
    return "";
  }
  
  switch (tile.tag) {
  case TILE_TYPE.CAPITAL: {
    const { foodStored, foodMaxCapacity, numUnitsToSpawnNextCycle, ticksPassed, ticksPerEggCycle, projectedFoodCostPerCycle, projectedSurplusFoodOverCostPerCyclePercentage } = tile;
    const percentageToCycleEnd = Math.ceil(ticksPassed / ticksPerEggCycle * 100);
    const surplusFoodPercentage = Math.ceil(projectedSurplusFoodOverCostPerCyclePercentage * 100);
    const foodStoredStr = _getFoodStoredMessageText(foodStored, foodMaxCapacity);
    return `CAPITAL. Spawns new units every cycle proportional to this tile's surplus food.\n\nCycle: ${percentageToCycleEnd}%\nNumber of new units arriving: ${numUnitsToSpawnNextCycle}\nFood: ${foodStoredStr}\nSurplus food percentage: ${surplusFoodPercentage}% `;
  }
  case TILE_TYPE.FOOD_STORAGE: {
    const { foodStored, foodMaxCapacity } = tile;
    const foodStoredStr = _getFoodStoredMessageText(foodStored, foodMaxCapacity);
    return "FOOD STORAGE. Holds a lot of food and soldiers.\n\n" +
      `Food: ${foodStoredStr}`;
  }
  case TILE_TYPE.FOOD_FARM: {
    const { foodStored, foodMaxCapacity } = tile;
    const foodStoredStr = _getFoodStoredMessageText(foodStored, foodMaxCapacity);
    // TODO(food production): Add food production rate.
    return "FARM. Produces food at a rate proportional to number of farmers.\n\n" +
      `Food: ${foodStoredStr}`;
  }
  case TILE_TYPE.ENEMY_CAMP: {
    return "ENEMY CAMP. Enemies come from here. Destroy all enemy camps to win the game.";
  }
  case TILE_TYPE.UNDER_CONSTRUCTION: {
    const { constructionProgress, constructionGoal } = tile;
    const constructionProgressInt = Math.min(Math.ceil(constructionProgress), constructionGoal);
    return `UNDER CONSTRUCTION.\n\nProgress: ${constructionProgressInt}/${constructionGoal}`;
  }
  }

  return "";
}

// Nat Nat -> String
// Returns the given stored and max capacity in the given format
// `${foodStored}kg/${foodMaxCapacity}kg (${theirPercentage}%)`.
// E.g "1000kg/1500kg (67%)"
function _getFoodStoredMessageText(foodStored, foodMaxCapacity) {
  const theirPercentage = Math.ceil(foodStored / foodMaxCapacity * 100);
  return `${foodStored}kg/${foodMaxCapacity}kg (${theirPercentage}%)`;
}

// ================================================================================
// FEATURE FUNCTIONS
// ================================================================================

function selectBuildTile(tileType) {
  world.buildTileSelected = tileType;
  world.dynamiteSelected = false;
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

// Uses the world's state to decide how the tile with the given position will be modified.
function modifyTileUsingBuildSettings(r, c) {
  if (world.dynamiteSelected) {
    destroyBuilding(r, c);
  } else if (world.buildTileSelected) {
    beginTileConstruction(r, c, world.buildTileSelected);
  } else {
    setTemporaryMessage("You need to pick a tile in the build menu in order to build.");
    playSFX("building_denied");
  }
}

// Converts the tile with the given position to a wall if it is not an enemy
// camp, walkable tile or capital.
function destroyBuilding(r, c) {
  const tileToDestroy = world.grid[r][c];
  if (tileToDestroy.tag === TILE_TYPE.ENEMY_CAMP ||
      tileToDestroy.tag === TILE_TYPE.CAPITAL ||
      tileToDestroy.tag === TILE_TYPE.WALKABLE_TILE) {
    setTemporaryMessage("You cannot destroy enemy camps like this. You have to send soldiers over to them.", 2.5);
    playSFX("building_denied");
    return;
  }

  // At this point, assume that building can be legally destroyed.

  // Evacuate all the society units to the other nearest building.
  const {r: friendlyTilePosR, c: friendlyTilePosC} = _searchNearestFriendlyTilePos(r, c);

  for (const [_, {units}] of tileToDestroy.society) {
    _directUnitsToOneOffPath(units, friendlyTilePosR, friendlyTilePosC);
  }

  // We need to get these units to come out of the tileToDestroy before the end
  // of this function body where the tile gets deleted. If we don't do this now,
  // then the onTickTileInPaths won't have a chance to run on the tile that got
  // destroyed. If we don't want to do this, the other option is to either delay
  // the destruction of the tileToDestroy (after _onTickTileInPaths has a chance
  // has to run naturally) or we allow walls to temporarily holds units that got evacuated.
  _onTickTileInPaths(tileToDestroy, world.grid, world.cyclicPaths);

  // Go through all one off paths. If a destination is the tileToDestroy, get
  // all units to join a new one off path where the destination is where they
  // came from.
  for (const oneOffPath of world.oneOffPaths) {
    const { orderedPoss, lastIndex } = oneOffPath;
    const { r: destR, c: destC } = orderedPoss[lastIndex];

    if (r === destR && c === destC) {
      oneOffPath.destroyed = true;
    }
  }

  // Go through all cyclic paths. If one end is the tileToDestroy, then get all
  // units in the path to go on a one off path to the other end (that isn't the
  // tileToDestroy).
  for (const cyclicPath of world.cyclicPaths) {
    const { orderedPoss, lastIndex } = cyclicPath;
    const { r: startR, c: startC } = orderedPoss[0];
    const { r: destR, c: destC } = orderedPoss[lastIndex];

    if (r === startR && c === startC) {
      cyclicPath.destroyed = true;
      cyclicPath.forceDest = {r: destR, c: destC};
      destroyCyclicPath(cyclicPath);
    } else if (r === destR && c === destC) {
      cyclicPath.destroyed = true;
      cyclicPath.forceDest = {r: startR, c: startC};
      destroyCyclicPath(cyclicPath);
    }
  }
  
  // Finally, we can actually replace the tile.
  world.grid[r][c] = _tileTypeToDefaultTile(TILE_TYPE.WALL);
  playSFX("building_destroyed");
}

// Search for the nearest friendly tile position from the tile with the given
// position. If not found, logs an error and returns the same given position.
function _searchNearestFriendlyTilePos(r0, c0) {
  const openList = [{r: r0, c: c0}];
  const closedList = [];

  while (openList.length > 0) {
    const {r, c} = openList.pop();

    const successors = _getSuccessorsForFriendly(world.grid, r, c);
    for (const successor of successors) {
      if (_posListContains(closedList, successor)) {
        continue;
      }
      
      if (isFriendlyTileType(world.grid[successor.r][successor.c].tag)) {
        return {r: successor.r, c: successor.c};
      }

      if (world.grid[successor.r][successor.c].tag === TILE_TYPE.WALKABLE_TILE) {
        openList.push(successor);
      }
    }

    closedList.push({r: r, c: c});
  }

  // Not found, log an error and return the given position as dummy data.
  console.error(`Unable to find nearest friendly tile position from posiion {r: ${r0}, c: ${c0}}. Returning that given position as result instead.`);
  return {r: r0, c: c0};
}

// Not to  be confused for _getSuccessors in path-finding.js. The condition for
// a valid successor is a little more broad.
function _getSuccessorsForFriendly(grid0, r, c) {
  const totalNeighbours = [
    {r: r - 1, c: c},
    {r: r + 1, c: c},
    {r: r, c: c - 1},
    {r: r, c: c + 1},
  ];

  const validSuccessors = totalNeighbours.filter((pos) => {
    return (pos.r >= 0 && pos.r < grid0.length &&
	    pos.c >= 0 && pos.c < grid0[pos.r].length &&
	    (grid0[pos.r][pos.c].tag === TILE_TYPE.WALKABLE_TILE ||
             isFriendlyTileType(grid0[pos.r][pos.c].tag)));
  });

  return validSuccessors;
}

// [List-of Pos] Pos -> Boolean
// Does the given list of positions contain the given position?
function _posListContains(posList, pos0) {
  for (const pos of posList) {
    if (posEquals(pos, pos0)) {
      return true;
    }
  }

  return false;
}

// You can only build if
// - The replaced tile is different from the new tile.
// - The replaced tile is neither an enemy camp, capital, or walkable tile.
// - The replaced tile is adjacent to a walkable tile.
// Building over legal non-walls take twice the time (as if the units
// destroyed it and built a new building.)
function beginTileConstruction(r, c, tileType) {
  const replacedTile = world.grid[r][c];

  // Check if cannot build.
  if (replacedTile.tag === tileType) {
    setTemporaryMessage("You cannot build over the same tile.");
    playSFX("building_denied");
    return;
  } else if (replacedTile.tag === TILE_TYPE.ENEMY_CAMP ||
             replacedTile.tag === TILE_TYPE.CAPITAL ||
             replacedTile.tag === TILE_TYPE.WALKABLE_TILE) {
    setTemporaryMessage(`You cannot build over the ${TILE_TYPE_STRING[replacedTile.tag]}.`);
    playSFX("building_denied");
    return;
  } else if (!adjacentToWalkableTile(world.grid, r, c)) {
    setTemporaryMessage("You can only build adjacent to walkable terrain.");
    playSFX("building_denied");
    return;
  }

  // Beyond this point, the construction is guaranteed to be legal.

  const underConstructionTile = _.cloneDeep(UNDER_CONSTRUCTION_PREFAB);
  underConstructionTile.resultingTileType = tileType;
  underConstructionTile.constructionProgress = 0;
  world.grid[r][c] = underConstructionTile;
  playSFX("building_built");
}

// Is the given position adjacent to at least one walkable tile in the world
// grid?
function adjacentToWalkableTile(grid, r, c) {
  const highestR = grid.length - 1;
  // Assumes that the grid is two dimensional, i.e grid.length > 0
  const highestC = grid[0].length - 1;
  
  // Check in order of top, bottom, left, right.
  return ((r > 0 && grid[r - 1][c].tag === TILE_TYPE.WALKABLE_TILE)||
          (r < highestR && grid[r + 1][c].tag === TILE_TYPE.WALKABLE_TILE) ||
          (c > 0 && grid[r][c - 1].tag === TILE_TYPE.WALKABLE_TILE) ||
          (c < highestC && grid[r][c + 1].tag === TILE_TYPE.WALKABLE_TILE));
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

function toggleDynamite() {
  if (world.dynamiteSelected) {
    world.dynamiteSelected = false;
  } else {
    world.buildTileSelected = false;
    world.dynamiteSelected = true;
  }
}

// Nat Nat -> Void
// Sends the selected units off a to a one-off path to the given map position
// row r and column c. Updates the world data definition only.
function directSelectedUnitsToOneOffPath(r, c) {
  _directUnitsToOneOffPath(world.selectedUnits, r, c);
}

// [Listof Unit] Nat Nat -> Void
// Pulled out from directSelectUnitsToOneOffPath so that directSelectedUnitsToCyclicPath can use this to get units that are not on the cyclic path to walk to the cyclic path.
function _directUnitsToOneOffPath(units, r, c) {
    // Generating all the needed oneOffPaths, and also set each unit's initial
  // pathIndex to 0.

  // NOTE(marvin): It's possible that one path is a subset of another path. We
  // ignore such a case for now.
  
  // Pos -> [Array-of CyclicPath]
  let oneOffPaths = new Map();

  for (const unit of units) {
    if (_posListContains(oneOffPaths.keys(), unit.pos)) {
      _getFromPosMap(oneOffPaths, unit.pos).numFollowers++;
    } else {
      const orderedPoss = generatePathOrderedPoss(world.grid, unit.pos.r, unit.pos.c, r, c);
      oneOffPaths.set(unit.pos, {
	tag: PATH_TYPE.ONE_OFF,
	orderedPoss: orderedPoss,
	numFollowers: 1,
	lastIndex: orderedPoss.length - 1,
        destroyed: false,
      });
    }

    unit.indexInPath = 0;
    unit.path = _getFromPosMap(oneOffPaths, unit.pos);

    unit.direction = DIRECTION.TO;
  }

  // Add generated oneOffPaths to the world.oneOffPaths. If a oneOffPath already
  // exists, then add the new number of units to that oneOffPaths.
  for (const [pos, path] of oneOffPaths) {
    _addOneOffPath(world, pos, {r: r, c: c}, path);
  }


  // ES6 Maps don't allow you to define your own equality check when getting
  // values from them... Need to make our own...
  function _getFromPosMap(posMap, pos0) {
    for (const [pos, val] of posMap) {
      if (posEquals(pos, pos0)) {
        return val;
      }
    }

    console.error("Pos (", pos0, ") is not found in posMap", posMap);
    return null;
  }
}

// Auxillary function for directSelectedUnitsToOneOffPath.
function _addOneOffPath(world, fromPos, toPos, newOneOffPath) {
  // An existing oneOffPath can be identified by having the same fromPos and
  // toPos (the path-finding algorithm is deterministic).
  for (const oneOffPath of world.oneOffPaths) {
    if (pathHasEnds(oneOffPath, fromPos, toPos)) {
      oneOffPath.numFollowers += newOneOffPath.numFollowers;
      return;

    }
  }

  world.oneOffPaths.push(newOneOffPath);
}


// CyclicPath -> Void
function destroyCyclicPath(path) {
  // Iterate backwards because we are mutating the array.
  for (let i = world.cyclicPaths.length - 1; i >= 0; i--) {
    const currPath = world.cyclicPaths[i];

    if (cyclicPathEquals(path, currPath)) {
      // Remove from world state
      world.cyclicPaths.splice(i, 1);

      // Tag path as destroyed
      currPath.destroyed = true;

      // Reassign all units in path units queue at the end points to a role at
      // the end point.
      const { orderedPoss, lastIndex } = currPath;

      const originPos = orderedPoss[0];
      const destinationPos = orderedPoss[lastIndex];

      const originTile = world.grid[originPos.r][originPos.c];
      const destinationTile = world.grid[destinationPos.r][destinationPos.c];

      _assimilatePathUnitsQueue(originTile, currPath);
      _assimilatePathUnitsQueue(destinationTile, currPath);
    }
  }
}

// Nat Nat Nat Nat -> Void
function createCyclicPath(r1, c1, r2, c2) {
  // NOTE(marvin):
  // It's the same behaviour as directSelectedUnitsToCyclicPath, but I created a
  // new function for this because the purpose is different and so we ought to
  // expose a difference function. Should the implementation details of
  // directSelectedUnitsToCyclicPath change such that it no longer suffices with
  // no selected units, then this function has to change.
  directSelectedUnitsToCyclicPath(r1, c1, r2, c2);
}

// Nat Nat Nat Nat -> Void
// Sends the selected units off to a cyclic path to the given origin and
// destination positions. Updates the world data definition only.
function directSelectedUnitsToCyclicPath(r1, c1, r2, c2) {
  const newCyclicPath = _createCyclicPath(r1, c1, r2, c2);

  // Adds a unique cyclic path to world.cyclicPaths. If it already exist, does
  // nothing. Two cyclicPaths are the same if their from and to destinations are the same.
  _addCyclicPath(world, {r: r1, c: c1}, {r: r2, c: c2}, newCyclicPath);

  // If the unit is not already in the path, the unit needs to first
  // travel to a point in the newCyclicPath's orderedPoss that is the
  // minimum distance. Let the movement code deal with this.
  for (const unit of world.selectedUnits) {
    const {orderedPoss} = newCyclicPath;

    unit.direction = DIRECTION.TO;

    if (orderedPoss.some(p => p.r === unit.pos.r && p.c === unit.pos.c)) {
      unit.path = newCyclicPath;
      unit.indexInPath = 0;
      unit.pathToJoin = false;
      unit.indexInPathToJoin = false;
      
      newCyclicPath.numFollowers++;
    } else {
      const indexWithMinDist = _getIndexWithMinDist(orderedPoss, unit.pos);
      const posWithMinDist = orderedPoss[indexWithMinDist];
      
      _directUnitsToOneOffPath([unit], posWithMinDist.r, posWithMinDist.c);
      unit.pathToJoin = newCyclicPath;
      unit.indexInPathToJoin = indexWithMinDist;

      // We add unit to numFollowers even though the unit isn't there yet so
      // that the the cyclic path isn't purged prematurely when no one has
      // arrived. Have to be careful that if there is a way to change the
      // pathToJoin, then the pathToJoin's numFollowers decreases.
      newCyclicPath.numFollowers++;
    }
  }
}

// [Listof Pos] Pos -> Nat
// Returns null if the given orderedPoss is empty.
function _getIndexWithMinDist(orderedPoss, pos) {
  // It's possible to use calculus or some other algebraic method.
  if (orderedPoss.length == 0) {
    console.warning("_getIndexWithMinDist: orderedPoss is empty.");
  }
  let lowestDistSoFar = Infinity;
  let rv = null;
  
  for (let i = 0; i < orderedPoss.length; i++) {
    const currDist = _getDistance(orderedPoss[i], pos);

    if (currDist < lowestDistSoFar) {
      lowestDistSoFar = currDist;
      rv = i;
    }
  }

  return rv;
}

// Manhattan distance. Implementation detail of _getIndexWithMinDist.
function _getDistance(pos1, pos2) {
  return Math.abs(pos1.r - pos2.r) + Math.abs(pos1.c - pos2.c);
}

function _addCyclicPath(world, fromPos, toPos, newCyclicPath) {
  for (const cyclicPath of world.cyclicPaths) {
    if (pathHasEnds(cyclicPath, fromPos, toPos)) {
      return;
    }
  }

  world.cyclicPaths.push(newCyclicPath);
}

// Nat Nat Nat Nat -> CyclicPath
function _createCyclicPath(r1, c1, r2, c2) {
  const orderedPoss = generatePathOrderedPoss(world.grid, r1, c1, r2, c2);
  
  return {
    tag: PATH_TYPE.CYCLIC,
    orderedPoss: orderedPoss,
    numFollowers: 0,
    lastIndex: orderedPoss.length - 1,
  };
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

// Nat Nat -> Boolean
// Is the position with the given row and column in the world grid a valid
// cyclic end point?
function isValidPathEndPoint(r, c) {
  const tile = world.grid[r][c];

  switch (tile.tag) {
  case TILE_TYPE.FOOD_STORAGE:
  case TILE_TYPE.FOOD_FARM:
  case TILE_TYPE.CAPITAL:
  case TILE_TYPE.ENEMY_CAMP:
  case TILE_TYPE.UNDER_CONSTRUCTION:
    return true;
  }

  return false;
}

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
    if(!hasAnyUnits(tile)) {
      console.log(`All enemy units destroyed in enemy camp [${r},${c}] - changing to walkable tile`);
      // Destroy the enemy camp by changing it to a walkable tile
      changeMapTile(r, c, TILE_TYPE.WALKABLE_TILE, true);
    }
  }
}

function hasAnyUnits(tile) {
  if (!tile) {
    return false;
  }
  if (!tile.society) {
    return false;
  }

  for (const [_, {units}] of tile.society) {
    if (units.length > 0) {
      return true;
    }
  }
}

// Tile CyclicPath -> Void
// Reassigns units in the path units queue (if any) of the given tile with the
// given path to roles of the given tile.
function _assimilatePathUnitsQueue(tile, path0) {
  if (tile.hasOwnProperty('pathUnitsQueues')) {

    // Iterate backwards because we are mutating the list
    for (let i = tile.pathUnitsQueues.length - 1; i >= 0; i--) {
      const pathUnitsQueue = tile.pathUnitsQueues[i];
      const { path, unitsQueue } = pathUnitsQueue;

      if (cyclicPathEquals(path, path0)) {
        for (const unit of unitsQueue) {
          _addUnitToRole(tile, _getLegalSocietyRoleToJoin(tile), unit);
        }
      }

      // Now that units are reassigned, remove pathUnitsQueue.
      tile.pathUnitsQueues.splice(i, 1);
    }
  }
}

// Tile -> Role
function _getLegalSocietyRoleToJoin(tile) {
  const societyRolesPriority = [
    ROLE.FARMER,
    ROLE.SOLDIER,
    ROLE.WALKER,
    ROLE.QUEEN,
    ROLE.BUILDER,
  ];

  for (const role of societyRolesPriority) {
    if (tile.society.has(role)) {
      return role;
    }
  }

  console.error("Tile did not have a role it could give.");
}

let shouldShowRoleButtons = false;
let savedDestinationR = undefined;
let savedDestinationC = undefined;
let selectedNextRole = undefined;

function _getSelectableRoles(tile) {
  let result = [];

  const roleKeys = [
    'FARMER',
    'SOLDIER',
    'WALKER',
    'BUILDER',
  ];

  for (const roleKey of roleKeys) {
    if (tile.society.has(ROLE[roleKey])) {
      result.push(roleKey);
    }
  }

  return result
}

// Tile -> Role
// Prioritise the player's choice, but if the player's choice is illegal, use
// the priority system.
function _getSelectedLegalSocietyRoleToJoin(tile) {
  if (tile.society.has(selectedNextRole)) {
    return selectedNextRole;
  } else {
    return _getLegalSocietyRoleToJoin(tile);
  }
}
