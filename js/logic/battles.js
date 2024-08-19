// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================

function _onTickBattles(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileBattles(tile, r, c);
    }
  }
}

// ================================================================================
// AUXILLARY FUNCTIONALITY
// ================================================================================

function _onTickTileBattles(tile, r, c) {
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
      // Each guard is worth two enemies.
      guards.pop();
      enemies.pop();
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
  } else {
    // The default behaviour is to let guards fight first, and then let everyone
    // else fight.

    // If the tile cannot host enemies, then battles cannot possibly take place.
    if (!tile.society.has(ROLE.ATTACKER)) {
      return;
    }

    if (tile.society.has(ROLE.SOLDIER)) {
      const enemies = tile.society.get(ROLE.ATTACKER).units;
      const guards = tile.society.get(ROLE.SOLDIER).units;
      while (guards.length > 0 && enemies.length > 0) {
        // Each guard is worth two enemies.
        guards.pop();
        enemies.pop();
        enemies.pop();
      }
    }

    _societyBattle(tile.society);
    if (tile.pathUnitsQueues) {
      _pathUnitsQueuesBattle(tile.society.get(ROLE.ATTACKER).units, tile.pathUnitsQueues);
    }

    // If there is at least one enemy, that means the enemies have defeated all
    // the guards, and the tile should get destroyed.
    const enemies = tile.society.get(ROLE.ATTACKER).units;
    if (enemies.length > 0) {
      changeMapTile(r, c, TILE_TYPE.WALL, true);
    }
  }
}

// [Mapping Role SocietyClass] -> Void
// All units of the society with enemy role fights every other role, except the queen. Mutates the
// given society as necessary.
// Assume that soldiers have already fought, and so there would be no
// soldiers.
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
