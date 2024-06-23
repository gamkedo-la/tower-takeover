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
  // For now, battles only occur in walkable tiles and the capital.
  if (tile.tag === TILE_TYPE.WALKABLE_TILE) {
    let yourUnits = tile.society.get(ROLE.WALKER);
    let enemyUnits = tile.society.get(ROLE.ATTACKER);

    const numBattles = Math.min(yourUnits.length, enemyUnits.length);

    yourUnits.length -= numBattles;
    enemyUnits.length -= numBattles;
  } else if (tile.tag === TILE_TYPE.CAPITAL) {
    // For now, only guards are used in battle. Potentially can use units in
    // queue.
    const guards = tile.society.get(ROLE.SOLDIER).units;
    const enemies = tile.society.get(ROLE.ATTACKER).units;
    while (guards.length > 0 && enemies.length > 0) {
      guards.pop();
      enemies.pop();
    }

    if (enemies.length > guards.length) {
      tile.isQueenAlive = false;
    }
  }
}
