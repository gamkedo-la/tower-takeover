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
 
      _onTickTileInPaths(tile, world.grid, world.cyclicPaths);
    }
  }

  // Resetting the unit.hasMovedInTick flag for all units in World
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      for (const [role, {units}] of tile.society) {
	for (const unit of units) {
	  unit.hasMovedInTick = false;
	}
      }

      // Reset units in tile
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
  for (const [role, {units}] of tile.society) {
    // The units array will be modified, so cannot use for...of
    for (let i = units.length - 1; i >= 0; i--) {
      _onTickUnitInPaths(units, i, worldGrid, worldPaths);
    }
  }

  if (tile.hasOwnProperty("pathUnitsQueues")) {
    for (const pathUnitsQueue of tile.pathUnitsQueues) {
      _onTickPathUnitsQueue(pathUnitsQueue, worldGrid, worldPaths);
    }
  }
}

// ([Array-of Unit], Nat, [2D-array-of Tile], [Array-of Path]): Void
// Moves the given unit (whose index is in the given units array) one step
// forward in the direction of its path (if moving at all), and if arrive at
// source or destination, add the unit to the queue, and drop off food if arrive
// at storage. If leaving source or destination, take food if farm.
function _onTickUnitInPaths(units, idx, worldGrid, worldPaths) {
  const unit = units[idx];
  
  // Moves the given unit one step forward in the given path from its given index
  // with the given direction, if it is moving.
  if (unit.hasMovedInTick || unit.path === false) {
    return;
  }

  let newIndexInPath = unit.indexInPath;
  if (unit.direction == DIRECTION.TO) {
    newIndexInPath++;
  } else if (unit.direction == DIRECTION.FROM) {
    newIndexInPath--;
  } else if (unit.direction == DIRECTION.STATIONARY) {
    unit.hasMovedInTick = true;
    return;
  }

  const posToMoveFrom = unit.path.orderedPoss[unit.indexInPath];
  const posToMoveTo = unit.path.orderedPoss[newIndexInPath];

  const tileToMoveFrom = worldGrid[posToMoveFrom.r][posToMoveFrom.c];
  const tileToMoveTo = worldGrid[posToMoveTo.r][posToMoveTo.c];

  _moveUnitToTile(units, idx, tileToMoveFrom, tileToMoveTo);
  unit.pos = posToMoveTo;
  unit.indexInPath = newIndexInPath;

  if (unit.path.tag === PATH_TYPE.ONE_OFF) {
    if (unit.indexInPath === unit.path.lastIndex) {
      // One off paths with no followers will be purged on a different pass.
      unit.path.numFollowers--;
      unit.path = false;
    }
  } else if (unit.path.tag === PATH_TYPE.CYCLIC) {
    // Change unit's direction if arrive at either end of the path.
    if (unit.indexInPath === unit.path.lastIndex) {
      unit.direction = DIRECTION.FROM;
    } else if (unit.indexInPath === 0) {
      unit.direction = DIRECTION.TO;
    }
  }

  unit.hasMovedInTick = true;
}

// Removes the unit with the given index in the given units array, that is in a
// tile, and adds it to an appropriate units array in tilesToMoveTo. If one off
// path, then it should be the designated role. If cyclic path, it should be the
// path units queue. The given units array must be mutable, and the given units
// array must be in tileToMoveFrom. The idx must be within units array.
function _moveUnitToTile(units, idx, tileToMoveFrom, tileToMoveTo) {
  const unit = units[idx];

  // Remove from given units array.
  units.splice(idx, 1);
  if (tileToMoveFrom === TILE_TYPE.FOOD_FARM) {
    unit.isCarryingFood = true;
    tileToMoveFrom.foodStored--;
  }

  // Add to new units array.
  _addUnitToTile(unit, tileToMoveTo);
}

// Unit Tile -> Void
function _addUnitToTile(unit, tile) {
  // Deal with special cases first, then general cases.
  // Special case 1: Your units walking into walkable tiles.
  // Special case 2: Enemy units walking into capital.
  // TODO: What role/queue a unit join when they enter a tile should be
  // something that is encoded in a data definition, not hiding in control flow.

  if (unit.affiliation === AFFILIATION.YOURS &&
      tile.tag === TILE_TYPE.WALKABLE_TILE) {
    _addUnitToRole(tile, ROLE.WALKER, unit);
  } else if (unit.affiliation === AFFILIATION.ENEMY &&
	     tile.tag === TILE_TYPE.CAPITAL) {
    _addUnitToRole(tile, ROLE.ATTACKER, unit);
  } else {
    // If one off, join based on priority. If cyclic, join the path units queue.
    if (unit.path.tag === PATH_TYPE.ONE_OFF) {
      _addUnitToRole(tile, _getLegalSocietyRoleToJoin(tile), unit);
    } else if (unit.path.tag === PATH_TYPE.CYCLIC) {
      if (tile.hasOwnProperty("pathUnitsQueues")) {
	// Add unit to the right queue
	for (const pathUnitsQueue of tile.pathUnitsQueues) {
	  if (pathUnitsQueue.path === unit.path) {
	    pathUnitsQueue.unitsQueue.push(unit);
	    unit.role = ROLE.WALKER;
	    break;
	  }
	}
      }
    }

    if (tile.tag == TILE_TYPE.FOOD_STORAGE && unit.isCarryingFood) {
      tile.foodStored++;
      unit.isCarryingFood = false;
    }
  }
}

// Tile -> Role
// Helper function for _addUnitToTile.
// TODO: This shouldn't be necessary. Players should be able to choose which
// society role a unit would join.
function _getLegalSocietyRoleToJoin(tile) {
  const societyRolesPriority = [
    ROLE.FARMER,
    ROLE.SOLDIER,
    ROLE.WALKER,
    ROLE.QUEEN,
  ];

  for (const role of societyRolesPriority) {
    if (tile.society.has(role)) {
      return role;
    }
  }

  console.error("Tile did not have a role it could give.");
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
