// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Updates enemy waves in terms of its timing, including its announcement, setting of the enemy paths
// and actually getting units to join the enemy paths to launch tha ttack.

// _onTickWorld : World -> Void
// Updates the enemy wave to increase its ticksPassed, and make the necessary
// announcements, enemy path making and attack launching.

// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================

function _onTickEnemyWave(world) {
  const { enemyWave, grid, capitalPos } = world;
  const { madeAnnouncement, ticksUntilEnemyWave, ticksUntilAnnounceEnemyWave, ticksPassed, paths, enemyCampPoss } = enemyWave;

  if (ticksPassed >= ticksUntilEnemyWave) {
    // Attack!
    for (const path of paths) {
      const enemyCampPos = path.orderedPoss[0];
      const enemyCamp = grid[enemyCampPos.r][enemyCampPos.c];

      launchAttack(enemyCamp, path);
    }

    // Book-keeping
    enemyWave.madeAnnouncement = false;
    enemyWave.ticksPassed = 0;
    enemyWave.ticksUntilEnemyWave = getRandomInt(30, 60);
    enemyWave.ticksUntilAnnounceEnemyWave = enemyWave.ticksUntilEnemyWave - getRandomInt(15, 25);
    return;
  } else if (ticksPassed >= ticksUntilAnnounceEnemyWave && !madeAnnouncement) {
    enemyWave.madeAnnouncement = true;

    // Logic for which buildings each enemy camp will go for, and how many units will be sent.
    for (const pos of enemyCampPoss) {
      const enemyTile = world.grid[pos.r][pos.c];
      const shouldGoForCapital = Math.random() < 0.5;
      const percentageOfEnemies = getRandomNum(0.5, 0.75);
      const numEnemies = Math.floor(enemyTile.society.get(ROLE.ATTACKER).units.length * percentageOfEnemies);
      if (shouldGoForCapital) {
        const orderedPoss = generatePathOrderedPoss(grid, pos.r, pos.c, capitalPos.r, capitalPos.c);
        paths.push({
          tag: PATH_TYPE.ATTACKER,
          orderedPoss: orderedPoss,
          numFollowers: numEnemies,
          lastIndex: orderedPoss.length - 1,
          initiated: false,
        });
      } else {
        // Includes capital, but that's fine.
        const allFriendlyBuildingsPoss = getAllFriendlyBuildingsPoss(grid);
        // Random element from array impl from https://stackoverflow.com/a/4550514
        const randFriendlyBuildingPos = allFriendlyBuildingsPoss[Math.floor(Math.random() * allFriendlyBuildingsPoss.length)];

        const orderedPoss = generatePathOrderedPoss(grid, pos.r, pos.c, randFriendlyBuildingPos.r, randFriendlyBuildingPos.c);
        paths.push({
          tag: PATH_TYPE.ATTACKER,
          orderedPoss: orderedPoss,
          numFollowers: numEnemies,
          lastIndex: orderedPoss.length - 1,
          initiated: false,
        });
      }

      // SMELL: Changing draw state in logic code is weird. Logic should have no
      // effect on draw code... or should it?
      drawState.paths.hasChanged = true;
    }

    setTemporaryMessage("The enemies are preparing for battle!");
  }

  enemyWave.ticksPassed++;

}

// ================================================================================
// AUXILLARY FUNCTIONALITY
// ================================================================================


// EnemyCamp EnemyPath -> Void
// Gets the number of units specified in the given enemy path from the given enemy camp to join the given
// enemy path.
function launchAttack(enemyCamp, path) {
  const { numFollowers } = path;

  for (const [role, {units}] of enemyCamp.society) {
    if (role === ROLE.ATTACKER) {
      const numEnemiesToSend = Math.min(numFollowers, units.length);
      for (let i = 0; i < numEnemiesToSend; i++) {
        const unit = units[i];
        unit.indexInPath = 0;
        unit.direction = DIRECTION.TO;
        unit.path = path;
      }
    }
  }

  path.initiated = true;
}
