// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for drawing the world using the HTML canvas API so that the
// players can see the game. This module is equivalent to the view in the MVC
// architecture. 
//
// initializeCanvas(Canvas): Void
// Initializes the canvas of the draw module. Ought to be called once prior to
// the start of the event loop.
//
// onDraw(): Void
// Draws the world with the HTML canvas API, ought to be called once by the
// event loop.

// ================================================================================
// DEPENDENCIES
// ================================================================================

// world, selectBuildTile from logic.js

// Draw code really shouldn't touch any logic functions, but we will take
// convenience over clean design for now.

// ================================================================================
// DATA DEFINITIONS
// ================================================================================

// These two should only be set by initializeContext function.
// They cannot be const because they are not initialized when the module gets
// initialized as they have to wait for window.onload.
let canvas, canvasContext;
let mouseX, mouseY;

// A BuildTileUIInfo is a (topLeftC: Number, topLeftR: Number, buildTiles:
// [List-of TileType]) which represents
// (top left column in logical positioning, top left row in logical
// positioning).
const buildTileUIInfo = {
  topLeftC: 1,
  topLeftR: 5,
  buildTiles: world.buildTileOptions,
}

// ================================================================================
// FUNCTION
// ================================================================================

// Ought to be called in window.onload.
function initializeCanvas(canvas0) {
  canvas = canvas0;
  canvasContext = canvas.getContext('2d');

  function _onMouseClick(evt) {
    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;

    document.getElementById("debugText").innerHTML = `click: (${mouseX}, ${mouseY})`;

    if (world.clickMode == CLICK_MODE.INFO) {
      // Check if the click happens inside a map tile.
      for (let r = 0; r < world.grid.length; r++) {
	for (let c = 0; c < world.grid[r].length; c++) {
	  if (mouseY >= r * 32 &&
	      mouseY <= (r + 1) * 32 &&
	      mouseX >= c * 32 &&
	      mouseX <= (c + 1) * 32) {
	    selectMapTile(r, c);
	  }
	}
      }
    } else if (world.clickMode == CLICK_MODE.BUILD) {
      // Check if the click happens to be inside a building select.
      // If so, log the selected building.
      // Deduce screen region from build tiles and log the tile type if click
      // within a region. Otherwise, do nothing.
      for (let i = 0; i < buildTileUIInfo.buildTiles.length; i++) {
	if (mouseY >= buildTileUIInfo.topLeftR * 32 &&
	    mouseY <= (buildTileUIInfo.topLeftR + 1) * 32 &&
	    mouseX >= (buildTileUIInfo.topLeftC + i) * 32 &&
	    mouseX <= (buildTileUIInfo.topLeftC + i + 1) * 32) {
	  const buildTile = buildTileUIInfo.buildTiles[i];
	  selectBuildTile(buildTile);
	}
      }

      // Check if the click happens in a tile in the map.
      // If so, changes the clicked tile to the selected build tile if not null.
      // In any other situation, does nothing.
      if (world.buildTileSelected != null) {
	for (let r = 0; r < world.grid.length; r++) {
	  for (let c = 0; c < world.grid[r].length; c++) {
	    if (mouseY >= r * 32 &&
		mouseY <= (r + 1) * 32 &&
		mouseX >= c * 32 &&
		mouseX <= (c + 1) * 32) {
	      changeMapTile(r, c, world.buildTileSelected);
	    }
	  }
	}
      }
    }
  }

  function _onKeyDown(evt) {
    const KEY_1 = 49;
    const KEY_2 = 50;

    evt.preventDefault();

    if (evt.keyCode == KEY_1) {
      changeClickMode(CLICK_MODE.INFO);
    } else if (evt.keyCode == KEY_2) {
      changeClickMode(CLICK_MODE.BUILD);
    }
  }
  
  const rect = canvas.getBoundingClientRect();
  const root = document.documentElement;
  canvas.addEventListener("click", _onMouseClick);
  document.addEventListener("keydown", _onKeyDown);
}

// Observes the world from the logic module, ideally without changing it.
// Assumes that initializeCanvas has been called.
function onDraw() {
  // Draw background.
  canvasContext.fillStyle = "rgb(58, 37, 37)";
  canvasContext.fillRect(0, 0, 1200, 680);
  
  // Drawing the tiles.
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      // Draw a tile, given row and column position.
      if (Array.isArray(tile)) {
	// White square first, with units on top. Fit as many units as possible.
	canvasContext.fillStyle = "white";
	canvasContext.fillRect(c * 32, r * 32, 32, 32);

	// A unit's anatomy:
	// Qyyyy
	//  yxxy
	//  yxxy
	// yxxxxy
	// yxooxy
	// yxooxy
	// yxxxxy
	// yyyyyy

	// o = food, x = body (ally or enemy color), y = outline,
	// Q = top-left most pixel coordinate
	// if no food and no outline, then they would just be x color.

	const hasBlueOutline = true;

	// Row and column position in pixels of the unit to be drawn within the
	// tile.
	let rr = 0;
	let cc = 0;
	// The length and width of a unit is 6x8, with a one pixel space between
	// them.
	let l = 8;
	let w = 6;
	let dl = l + 1;
	let dw = w + 1;

	for (let i = 0; i < tile.length; i++) {
	  // Draw a unit, with rr, cc, l, w, dl, dw as accumulators.
	  const unit = tile[i];
	  if (cc >= 32) {
	    cc = 0;
	    rr += dl;
	  }

	  // Drawing strategy:
	  // Let (c, r) be the top-left most pixel coordinate Q
	  // - Draw everything as if everything is x.
	  //   - Draw beginning at (c + 1, r), 4x3.
	  //   - Draw beginning at (c, r + 3), 6x5.
	  // - Draw food if it exists.
	  //   - Draw beginning at (c + 2, r + 4), 2x2.
	  // - Draw outline if it exists.
	  //   - Draw beginning at (c + 1, r), 1x3.
	  //   - Draw beginning at (c, r + 3), 1x5.
	  //   - Draw beginning at (c + 1, r + 7), 4x1.
	  //   - Draw beginning at (c + 5, r + 3), 1x5.
	  //   - Draw beginning at (c + 4, r), 1x3.
	  //   - Draw beginning at (c + 2, r), 2x1.

	  const mainColorComponent = 155 + 100 * (unit.energy / 100);
	  const otherColorComponents = 255 - 255 * (unit.energy / 100);
	  // If yours, color green, if enemy, color red.
	  if (unit.affiliation === AFFILIATION.YOURS) {
	    canvasContext.fillStyle = `rgb(${otherColorComponents}, ${mainColorComponent}, ${otherColorComponents})`;
	  } else if (unit.affiliation === AFFILIATION.ENEMY) {
	    canvasContext.fillStyle = `rgb(${mainColorComponent}, ${otherColorComponents}, ${otherColorComponents})`;
	  }

	  // Draw everything as if x.
	  _drawRectangleInSubtile(canvasContext, c, r, cc + 1, rr, 4, 3);
	  _drawRectangleInSubtile(canvasContext, c, r, cc, rr + 3, 6, 5);

	  // Draw food if it exists
	  if (unit.isCarryingFood) {
	    canvasContext.fillStyle = "orange";
	    _drawRectangleInSubtile(canvasContext, c, r, cc + 2, rr + 4, 2, 2);
	  }

	  // Draw outline if it exists
	  if (hasBlueOutline) {
	    canvasContext.fillStyle = "blue";
	    _drawRectangleInSubtile(canvasContext, c, r, cc + 1, rr, 1, 3);
	    _drawRectangleInSubtile(canvasContext, c, r, cc, rr + 3, 1, 5);
	    _drawRectangleInSubtile(canvasContext, c, r, cc + 1, rr + 7, 4, 1);
	    _drawRectangleInSubtile(canvasContext, c, r, cc + 5, rr + 3, 1, 5);
	    _drawRectangleInSubtile(canvasContext, c, r, cc + 4, rr, 1, 3);
	    _drawRectangleInSubtile(canvasContext, c, r, cc + 2, rr, 2, 1);
	  }
	  
	  cc += dw;
	}
      } else {
	_drawTileTypeAtPos(tile.tag, c, r);
      }
    }
  }

  // Drawing the paths.
  for (const path of world.paths) {
    // Drawing a single path.
    canvasContext.strokeStyle = "black";
    canvasContext.lineWidth = 1;

    let prevPos = path.orderedPoss[0];
    
    for (let i = 1; i < path.orderedPoss.length; i++) {
      const currPos = path.orderedPoss[i];
      
      // Connect lines between the center of the tiles.
      canvasContext.beginPath();
      canvasContext.moveTo(prevPos.c * 32 + 15, prevPos.r * 32 + 15);
      canvasContext.lineTo(currPos.c * 32 + 15, currPos.r * 32 + 15);
      canvasContext.stroke();

      prevPos = currPos;
    }
  }

  if (world.clickMode == CLICK_MODE.INFO && world.mapTileSelected != null) {
    // Window to show units in the selected tile.
    // NOTE(marvin): There will likely be overlaps with the existing walkable
    // tile draw code. Opportunity for compression.

    // Pixel positions
    const topLeftR = 0;
    const topLeftC = 800;
    const tile = world.mapTileSelected;

    if (Array.isArray(tile)) {
      const hasBlueOutline = true;

      // Row and column position in pixels of the unit to be drawn within the
      // window.
      let rr = 0;
      let cc = 0;

      // The length and width of a units is 18x24, with 4 pixels space between
      // them.
      const l = 18;
      const w = 24;
      const dl = l + 4;
      const dw = w + 4;

      for (let i = 0; i < tile.length; i++) {
	// Draw a unit, with rr, cc, l, w, dl, dw as accumulators.
	const unit = tile[i];

	// If off the screen, wrap around.
	if (cc >= 1200) {
	  cc = 0;
	  rr += dl;
	}

	const mainColorComponent = 155 + 100 * (unit.energy / 100);
	const otherColorComponents = 255 - 255 * (unit.energy / 100);

	if (unit.affiliation === AFFILIATION.YOURS) {
	  canvasContext.fillStyle = `rgb(${otherColorComponents}, ${mainColorComponent}, ${otherColorComponents})`;
	} else if (unit.affiliation === AFFILIATION.ENEMY) {
	  canvasContext.fillStyle = `rgb(${mainColorComponent}, ${otherColorComponents}, ${otherColorComponents})`;
	}

	// IWASHERE: Copy over the unit draw code, but replace
	// _drawRectangleInSubtile with regular draw rect.
	// The constants would have to change as well... just eye ball it, the
	// design is likely to change.

	canvasContext.fillRect(topLeftC + cc + 4, topLeftR + rr, 16, 9);
	canvasContext.fillRect(topLeftC + cc, topLeftR + rr + 12, 24, 20);

	if (unit.isCarryingFood) {
	  canvasContext.fillStyle = "orange";
	  canvasContext.fillRect(topLeftC + cc + 8, topLeftR + rr + 16, 8, 8);
	}

	cc += dw;
      }
      
    } else if (tile.tag == TILE_TYPE.FOOD_STORAGE) {
      // TODO(marvin): Do the other cases.
    }
  } else if (world.clickMode == CLICK_MODE.BUILD) {
    // Draw the build tile options window.
    // These are arbitrary values, tune them as necessary and potentially make
    // their positions dependent on the positions of other UI elements.
    for (let i = 0; i < buildTileUIInfo.buildTiles.length; i++) {
      const buildTile = buildTileUIInfo.buildTiles[i];
      const cc = i;

      _drawTileTypeAtPos(buildTile, buildTileUIInfo.topLeftC + cc, buildTileUIInfo.topLeftR);
    }

    // Draw the currently selected tile.
    const selectedBuildTileTopLeftR = 7;
    const selectedBuildTileTopLeftC = 1;

    if (world.buildTileSelected != null) {
	_drawTileTypeAtPos(world.buildTileSelected,
			   selectedBuildTileTopLeftR,
			   selectedBuildTileTopLeftC);
    }
  }
}

// c and r are in terms of 32
function _drawTileTypeAtPos(tileType, c, r) {
  if (tileType === TILE_TYPE.WALKABLE_TILE) {
    // White square.
    canvasContext.fillStyle = "white";
    canvasContext.fillRect(c * 32, r * 32, 32, 32);
  } else if (tileType === TILE_TYPE.WALL) {
    // Black square.
    canvasContext.fillStyle = "black";
    canvasContext.fillRect(c * 32, r * 32, 32, 32);
  } else if (tileType === TILE_TYPE.FOOD_STORAGE) {
    // Blue square.
    canvasContext.fillStyle = "blue";
    canvasContext.fillRect(c * 32, r * 32, 32, 32);
  } else if (tileType === TILE_TYPE.FOOD_FARM) {
    // Orange square.
    canvasContext.fillStyle = "orange";
    canvasContext.fillRect(c * 32, r * 32, 32, 32);
  } else if (tileType === TILE_TYPE.CAPITAL) {
    // Green square.
    canvasContext.fillStyle = "green";
    canvasContext.fillRect(c * 32, r * 32, 32, 32);
  } else if (tileType === TILE_TYPE.ENEMY_CAMP) {
    // Red square.
    canvasContext.fillStyle = "red";
    canvasContext.fillRect(c * 32, r * 32, 32, 32);
  }
}

// A subtile is a smaller tile within a grid of tiles in a 32x32 tile.
function _drawRectangleInSubtile(canvasContext, tileTopLeftC, tileTopLeftR, subtileTopLeftC, subtileTopLeftR, width, height) {
  canvasContext.fillRect(
    tileTopLeftC * 32 + subtileTopLeftC,
    tileTopLeftR * 32 + subtileTopLeftR,
    width, height
  );
}
