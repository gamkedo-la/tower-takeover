// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Updates all units to take one step closer to their destination, and if a unit
// is already at their destination, to drop off what they are carrying, or to
// take a resource and leave one step out. The implementation detail of the paths require that a separate pass to remove paths that are no longer used, hence the purge function.

// _onTickPaths : World -> Void
// _onTickPurgeUnfollowedPaths : World -> Void

// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================


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

// Purges unfollowed one off paths.
// Currently only works with oneOff paths only.
function _onTickPurgeUnfollowedPaths(world) {
  // Can't use for...of because mutating the array.
  for (let i = world.oneOffPaths.length - 1; i >= 0; i--) {
    const currOneOffPath = world.oneOffPaths[i];
    if (currOneOffPath.numFollowers <= 0) {
      world.oneOffPaths.splice(i, 1);
    }
  }
}

// ================================================================================
// AUXILLARY FUNCTIONALITY
// ================================================================================

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
