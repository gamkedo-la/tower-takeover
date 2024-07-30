// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================

function _onTickBattles(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileBattles(tile);
    }
  }
}

// ================================================================================
// AUXILLARY FUNCTIONALITY
// ================================================================================

function _onTickTileBattles(tile) {
  // For now, battles only occur in walkable tiles, the capital and enemy camps.
  if (tile.tag === TILE_TYPE.WALKABLE_TILE) {
    let yourUnits = tile.society.get(ROLE.WALKER);
    let enemyUnits = tile.society.get(ROLE.ATTACKER);

    const numBattles = Math.min(yourUnits.length, enemyUnits.length);

    yourUnits.length -= numBattles;
    enemyUnits.length -= numBattles;
  } else if (tile.tag === TILE_TYPE.CAPITAL) {
    // The guards fight first, then everyone else in any order. If there's
    // literally no one else in the tile but the queen, and there's at least on
    // enemy, then the queen dies.
    const guards = tile.society.get(ROLE.SOLDIER).units;
    const enemies = tile.society.get(ROLE.ATTACKER).units;
    while (guards.length > 0 && enemies.length > 0) {
      guards.pop();
      enemies.pop();
    }

    _societyBattle(tile.society);
    _pathUnitsQueuesBattle(tile.society.get(ROLE.ATTACKER).units, tile.pathUnitsQueues);

    if (enemies.length > 0) {
      tile.isQueenAlive = false;

      // TODO(lose): Put the game into the lose state.
    }
  } else if (tile.tag === TILE_TYPE.ENEMY_CAMP) {
    const yourUnits = tile.society.get(ROLE.SOLDIER).units;
    const enemyUnits = tile.society.get(ROLE.ATTACKER).units;

    const numBattles = Math.min(yourUnits.length, enemyUnits.length);

    yourUnits.length -= numBattles;
    enemyUnits.length -= numBattles;
  }
}

// [Mapping Role SocietyClass] -> Void
// All units of the society with enemy role fights every other role, except the queen. Mutates the
// given society as necessary.
function _societyBattle(society) {
  const enemyUnits = society.get(ROLE.ATTACKER).units;

  for (const [role, {units}] of society) {
    if (role === ROLE.ATTACKER || role === ROLE.QUEEN) {
      continue;
    }

    while (units.length > 0 && enemyUnits.length > 0) {
      units.pop();
      enemyUnits.pop();
    }
  }
}

// [List-of Unit] [List-of PathUnitsQueue] -> Void
// All of the given units fight the given path units queues, mutating the given
// arguments as necessary.
function _pathUnitsQueuesBattle(units, pathUnitsQueues) {
  for (const pathUnitsQueue of pathUnitsQueues) {
    const { unitsQueue } = pathUnitsQueue;

    while (units.length > 0 && unitsQueue.length > 0) {
      units.pop();
      unitsQueue.pop();
    }
  }
}
