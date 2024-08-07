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

  // Food farm should restore food first.
  if (tile.tag === TILE_TYPE.FOOD_FARM) {
    tile.foodStored = Math.min(tile.foodStored + 150, tile.foodMaxCapacity);
  }

  // Units that are holding food because the tile's food storage was full before
  // should check if there is space this time and if so add to it.
  for (const [_, {units}] of tile.society) {
    for (const unit of units) {
      if (unit.isCarryingFood && tile.foodStored <= tile.foodMaxCapacity - 30) {
        tile.foodStored += 30;
        unit.isCarryingFood = false;
      }
    }
  }

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
    unit.energy += foodToTake;
    foodRemaining -= foodToTake;
  }

  return foodRemaining;
}

// [List-of Unit] -> Nat
// How much food would the given list of units take this tick? Should mirror _feedUnits.
// A helper function for _getFoodCostPerCycle in eggs.js.
function getUnitsFoodCost(units) {
  let foodCost = 0;

  // Unlike _feedUnits, we don't care about foodRemaining.
  
  for (const unit of units) {
    // Assume take 10.
    foodCost += 10;
  }

  return foodCost;
}

// Nat -> Nat
// How many units can be sustained by the given food amount in a tick? Assume
// that a unit eats 10 per tick.
function getUnitsCanSustain(food) {
  return Math.floor(food / 10);
}


