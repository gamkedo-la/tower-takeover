// Responsible for the capital's ability to spawn some number of units every X
// number of seconds, proportional to how much food the capital gets.

// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================

function _onTickEggs(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileEggs(tile);
    }
  }
}

// ================================================================================
// AUXILLARY FUNCTIONALITY
// ================================================================================

// At the end fo each cycle, take a percentage of foodStored, an amount that can
// be spared.
function _onTickTileEggs(tile) {
  // foodForEggs = leftoverFoodThisCycle * PERCENTAGE
  // 100% when foodStored is double of current estimated food cost per cycle
  // 75% when foodStored is equal to the current estimated food cost per cycle

  if (tile.tag !== TILE_TYPE.CAPITAL) {
    return;
  }

  // ticksPassed, ticksPerEggCycle

  // Don't do anything if it's not the end of the cycle.
  if (tile.ticksPassed < tile.ticksPerEggCycle) {
    tile.ticksPassed += 1;
    return;
  }

  // Spawn the current cycle's units

  for (let i = 0; i < tile.numUnitsToSpawnNextCycle; i++) {
    const newUnit = _.cloneDeep(UNIT_PREFAB);
    newUnit.affiliation = AFFILIATION.YOURS;
    newUnit.direction = DIRECTION.STATIONARY;
    newUnit.role = ROLE.SOLDIER;
    
    tile.society.get(ROLE.SOLDIER).units.push(newUnit);
  }

  // Dealing with food to prepare for next cycle's units.
  const leftoverFoodThisCycle = tile.foodStored;
  const foodCostPerCycle = _getFoodCostPerCycle(tile);

  const foodForEggs = leftoverFoodThisCycle *
        (0.75 + (0.25 *
                 (Math.max(Math.min((leftoverFoodThisCycle - foodCostPerCycle) / foodCostPerCycle, 1), 0))));

  tile.numUnitsToSpawnNextCycle = getUnitsCanSustain(foodForEggs / tile.ticksPerEggCycle);

  tile.foodStored -= foodForEggs;

  // Book keeping
  tile.ticksPassed = 0;
}

// Capital -> Nat
// How much food does all the units need to consume in order to stay alive in
// the given capital's cycle? Ignores units in pathUnitsQueues.
function _getFoodCostPerCycle(capital) {
  const { ticksPerEggCycle, society } = capital;

  let foodCostPerTick = 0;

  for (const [_, {units}] of society) {
    foodCostPerTick += getUnitsFoodCost(units);
  }

  const foodCostPerCycle = foodCostPerTick * ticksPerEggCycle;

  return foodCostPerCycle;
}
