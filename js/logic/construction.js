// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================

function _onTickConstruction(world) {
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      _onTickTileConstruction(tile, world.grid, r, c);
    }
  }
}

// ================================================================================
// AUXILLARY FUNCTIONALITY
// ================================================================================

// Makes progress on the tile's construction, and if it's done, changes the
// world grid at its position, row r and column c, to the resulting tile.
function _onTickTileConstruction(tile, worldGrid, r, c) {
  switch (tile.tag) {
  case TILE_TYPE.UNDER_CONSTRUCTION:
    const { society, constructionProgress, constructionGoal, resultingTileType } = tile;
    const numUnits = society.get(ROLE.BUILDER).units.length;

    if (numUnits <= 0) {
      return;
    }

    // y = 3.5ln10x - 6
    // where y is the new construction progress to add this game logic frame and
    // x is the number of units.

    // Assuming 1 game logic frames per second
    // 1 unit  ~= 2.06 progress ~=  48.54 seconds
    // 2 units ~= 4.485 progress ~= 22.3 seconds
    // 3 units ~= 5.9 progress ~= 16.95 seconds
    // 4 units ~= 6.9 progress ~= 14.5 seconds
    // ...
    // 9 units ~= 9.75 progress ~= 10.26 seconds
    // 10 units ~= 10.1 progress ~= 9.9 seconds

    tile.constructionProgress += (3.5 * Math.log(10 * numUnits)) - 6;

    if (tile.constructionProgress >= tile.constructionGoal) {
      const newTile = _tileTypeToDefaultTile(resultingTileType);
      worldGrid[r][c] = newTile;

      // TODO(construction): If selecting the under construction tile that is
      // now built, select nothing.
      
      playSFX("building_built");

      // Move units in construction society over to resultingTile's society.
      for (const [_, {units}] of tile.society) {
        for (const unit of units) {
          _addUnitToRole(newTile, _getLegalSocietyRoleToJoin(newTile), unit);
        }
      }
    }
  }
}
