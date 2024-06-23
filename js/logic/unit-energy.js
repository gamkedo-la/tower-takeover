// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Updates all units to gain and lose energy, such that units have a chance to
// eat before completely dying, and units that have full energy will lose energy
// first before eating again.

// _onTickUnitsEatAndDecay : World -> Void   


// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================

function _onTickUnitsEatAndDecay(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileEatAndDecay(tile);
    }
  }
}


// ================================================================================
// AUXILLARY FUNCTIONALITY
// ================================================================================

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


