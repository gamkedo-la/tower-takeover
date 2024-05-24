// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for drawing the world using the HTML canvas API so that the
// players can see the game, as well as reading user input from keyboard and
// mouse.

// initializeDraw(Canvas): Void
// Initializes the canvas of the draw module. Ought to be called once prior to
// the start of the event loop.
//
// onDraw(): Void
// Draws the world with the HTML canvas API, ought to be called once by the
// event loop.

// ================================================================================
// DEPENDENCIES
// ================================================================================
// world from logic.js

// ================================================================================
// DATA DEFINITIONS
// ================================================================================

// These two should only be set by initializeContext function.
// They cannot be const because they are not initialized when the module gets
// initialized as they have to wait for window.onload.
let canvas, canvasContext;


let tileUnitsInDisplay = [];  // 2D array, rebuilt every frame

// ================================================================================
// FUNCTIONS
// ================================================================================

// TODO(marvin): Move the input callback functions elsewhere. Still need access
// to the view's data definitions. Perhaps have a module called UI, which
// contains input handling as well as placement of GUI blocks.

// Ought to be called in window.onload.
function initializeDraw(canvas0) {
  canvas = canvas0;
  canvasContext = canvas.getContext('2d');
}

// Assumes that given pixel position is inside tile units display.
function convertPxPosToLogicalPosInTileUnitsDisplay(pxPos) {
  const posRelativeToTopLeft = {
    x: pxPos.x - unitsInTileUIInfo.topLeftX,
    y: pxPos.y - unitsInTileUIInfo.topLeftY
  };

  const maxPosRelativeToTopLeft = {
    x: 1200 - unitsInTileUIInfo.topLeftX,
    y: 680 - unitsInTileUIInfo.topLeftY,
  };

  // TODO(marvin): Generalise these constants to a struct, shared between the
  // draw and this.
  const l = 18;
  const w = 24;
  const dl = 4;
  const dw = 4;

  const flooredX = Math.ceil(posRelativeToTopLeft.x / (l + dl));
  const remX = posRelativeToTopLeft.x % (l + dl);
  const borderX = (remX <= l) ? 0 : 0.5;

  const flooredY = Math.ceil(posRelativeToTopLeft.y / (w + dw));
  const remY = posRelativeToTopLeft.y % (w + dw);
  const borderY = (remY <= w) ? 0: 0.5;

  return {
    x: flooredX + borderX,
    y: flooredY + borderY,
  };
}


// Observes the world from the logic module, ideally without changing it.
// Assumes that initializeDraw has been called.
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

	_drawUnitsTable(tile, 30, 24, 2, 2, c * 32, r * 32, 32);
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

    // Pixel positions
    const tile = world.mapTileSelected;

    if (Array.isArray(tile)) {
      _drawUnitsTable(tile, 42, 32, 4, 4, unitsInTileUIInfo.topLeftX, unitsInTileUIInfo.topLeftY, 1200 - unitsInTileUIInfo.topLeftY, tileUnitsInDisplay);
    } else if (tile.tag == TILE_TYPE.FOOD_STORAGE) {
      // TODO(marvin): Do the other cases.
      // TODO(marvin): Create function Tile -> [List-of (Role,
      // Units)]. Every tile should generalize list of units with their fields
      // to just Role to units mapping.
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


// Draws a 2D grid of units that are in the given tile, with each unit having a
// vertical length l, width w, vertical gap dl, and horizontal gap dw, with the
// grid having the top left (X, Y) px coordinates as topLeftX and topLeftY
// respectively, and a total width of tableWidthPx.
function _drawUnitsTable(units, l, w, dl, dw, topLeftX, topLeftY, tableWidthPx, refGrid = false) {
  const maximumX = topLeftX + tableWidthPx;
  if (refGrid) {
    // Reset refGrid to its initial state, a 2D array with only one element,
    // which is an empty array.
    refGrid.length = 0;
    refGrid.push([]);
  }
  
  // Row and column position in px of the unit to be drawn.
  let rr = 0;
  let cc = 0;

  for (const unit of units) {
    if (cc >= maximumX) {
      cc = 0;
      rr += l + dl;

      if (refGrid) {
	refGrid.push([]);
      }
    }

    _drawUnit(unit, topLeftX + cc, topLeftY + rr, l, w);

    if (refGrid) {
      refGrid[refGrid.length - 1].push(unit);
    }
    
    cc += w + dw;
  }
}

// A unit's (rough) anatomy:
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

// Ideally, l should be divisible by 6, and l divisible by 8.
function _drawUnit(unit, topLeftX, topLeftY, l, w) {
  const mainColorComponent = 155 + 100 * (unit.energy / 100);
  const otherColorComponents = 255 - 255 * (unit.energy / 100);

  // Fill in the entire cell if light blue
  if (unit.isSelected) {
    canvasContext.fillStyle = `rgb(173, 216, 230)`;  // Light blue.
    canvasContext.fillRect(topLeftX, topLeftY, l, w);
  }

  // The base (head + body)
  canvasContext.fillStyle = (unit.affiliation === AFFILIATION.YOURS)
    ? `rgb(${otherColorComponents}, ${mainColorComponent}, ${otherColorComponents})`
    : `rgb(${mainColorComponent}, ${otherColorComponents}, ${otherColorComponents})`;
  canvasContext.fillRect(topLeftX + (w / 8), topLeftY, (w / 4 * 3), l / 3);
  canvasContext.fillRect(topLeftX, topLeftY + (l / 3) + 4, w, l / 3 * 2 - 4);

  if (unit.isCarryingFood) {
    canvasContext.fillStyle = "orange";
    canvasContext.fillRect(
      topLeftX + (w / 4),
      topLeftY + l / 2 + 3,
      w / 2,
      l / 3 - 2);
  }
}
