// World -> Void
// Spawns enemies in the enemy camps in the given world.
function _onTickEnemySpawn(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      if (tile.tag == TILE_TYPE.ENEMY_CAMP) {
        _onTickTileEnemySpawn(tile);
      }
    }
  }
}

// EnemyCamp -> Void
// Spawns enemies in the given enemy camp based on the ticks.
function _onTickTileEnemySpawn(enemyCamp) {
  const { toSpawnTicksSoFar, numTicksToSpawn, toIncreaseSpawnTicksSoFar, numTicksToIncreaseSpawn, numToSpawn, society } = enemyCamp;

  if (toSpawnTicksSoFar >= numTicksToSpawn) {
    for (let i = 0; i < numToSpawn; i++) {
      const unitToAdd = _.cloneDeep(UNIT_PREFAB);
      unitToAdd.role = ROLE.ATTACKER;
      unitToAdd.affiliation = AFFILIATION.ENEMY;
      society.get(ROLE.ATTACKER).units.push(unitToAdd);
    }
      
    enemyCamp.toSpawnTicksSoFar = 0;
  }

  if (toIncreaseSpawnTicksSoFar >= numTicksToIncreaseSpawn) {
    enemyCamp.numToSpawn++;
    enemyCamp.toIncreaseSpawnTicksSoFar = 0;
  }

  enemyCamp.toSpawnTicksSoFar++;
  enemyCamp.toIncreaseSpawnTicksSoFar++;
}
