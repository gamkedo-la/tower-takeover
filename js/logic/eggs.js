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

function _onTickTileEggs(tile) {
  // Only the capital is affected here.
  if (tile.tag === TILE_TYPE.CAPITAL) {
    // Increase all ticksPassed by one.
    // If a group's ticksPassed is >= 10, then turn them into units inside the
    // guards.
    for (let i = tile.eggTimeGroups.length - 1; i >= 0; i--) {
      // Tick egg time groups, and hatch a group into the given tile's guards if
      // enough time has passed.
      const eggTimeGroup = tile.eggTimeGroups[i];

      eggTimeGroup.ticksPassed += 1;

      if (eggTimeGroup.ticksPassed >= 10) {
	for (let i = 0; i < eggTimeGroup.eggs; i++) {
          const newUnit = _.cloneDeep(UNIT_PREFAB);
          newUnit.affiliation = AFFILIATION.YOURS;
          newUnit.direction = DIRECTION.STATIONARY;
          newUnit.role = ROLE.SOLDIER;
          
	  tile.society.get(ROLE.SOLDIER).units.push(newUnit);
	}

	// Remove group.
	tile.eggTimeGroups.splice(i, 1);
      }
    }
  }
}

