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

// These two should only be set by initializeDraw function.
// They cannot be const because they are not initialized when the module gets
// initialized as they have to wait for window.onload.
let canvas, canvasContext;


let tileUnitsInDisplay = [];  // 2D array, rebuilt every frame


const roleToBgColor = new Map([
  [ROLE.FARMER, 'rgb(255, 178, 102)'],
  [ROLE.SOLDIER, 'rgb(51, 153, 255)'],
  [ROLE.WALKER, 'rgb(51, 153, 255)'],
  [ROLE.QUEEN, 'rgb(255, 255, 153)'],
  [ROLE.ATTACKER, 'rgb(0, 0, 0)'],  // Enemies will be red, so the background
				    // shouldn't be
]);

// ================================================================================
// FUNCTIONS
// ================================================================================

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

  const {l, w, dl, dw} = unitInTileUIInfo;

  const flooredX = Math.floor(posRelativeToTopLeft.x / (l + dl));
  const remX = posRelativeToTopLeft.x % (l + dl);
  const borderX = (remX <= l) ? 0 : 0.5;

  const flooredY = Math.floor(posRelativeToTopLeft.y / (w + dw));
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
      if (tile.tag === TILE_TYPE.WALKABLE_TILE) {
	// White square first, with units on top. Fit as many units as possible.
	canvasContext.fillStyle = "white";
	canvasContext.fillRect(c * squareLength, r * squareLength, squareLength, squareLength);

	_drawUnitsTable(tile.society.get(ROLE.WALKER).units.concat(tile.society.get(ROLE.ATTACKER).units), 30, 24, 2, 2, c * squareLength, r * squareLength, squareLength);
      } else {
	_drawTileTypeAtPos(tile.tag, c, r);
      }
    }
  }

  // Drawing the paths.
  for (const path of world.cyclicPaths) {
    // Drawing a single path.
    canvasContext.strokeStyle = "black";
    canvasContext.lineWidth = 1;

    let prevPos = path.orderedPoss[0];
    
    for (let i = 1; i < path.orderedPoss.length; i++) {
      const currPos = path.orderedPoss[i];
      
      // Connect lines between the center of the tiles.
      canvasContext.beginPath();
      canvasContext.moveTo(prevPos.c * squareLength + 15, prevPos.r * squareLength + 15);
      canvasContext.lineTo(currPos.c * squareLength + 15, currPos.r * squareLength + 15);
      canvasContext.stroke();

      prevPos = currPos;
    }
  }

  if (world.clickMode == CLICK_MODE.INFO && world.mapTileSelected != null) {
    // Window to show units in the selected tile.

    // Pixel positions
    const tile = world.mapTileSelected;

    _drawSocietyTable(tile.society, 42, 32, 4, 4, unitsInTileUIInfo.topLeftX, unitsInTileUIInfo.topLeftY, 1200 - unitsInTileUIInfo.topLeftX, tileUnitsInDisplay);

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

  if (mouseDownPos) {
    canvasContext.save();
    canvasContext.strokeStyle = 'black';
    canvasContext.strokeRect(mouseDownPos.x, mouseDownPos.y, mouseX - mouseDownPos.x, mouseY - mouseDownPos.y);
    canvasContext.restore();
  }
}

// c and r are in terms of squareLength
function _drawTileTypeAtPos(tileType, c, r) {
  if (tileType === TILE_TYPE.WALKABLE_TILE) {
    // White square.
    canvasContext.fillStyle = "white";
    canvasContext.fillRect(c * squareLength, r * squareLength, squareLength, squareLength);
  } else if (tileType === TILE_TYPE.WALL) {
    // Black square.
    canvasContext.fillStyle = "black";
    canvasContext.fillRect(c * squareLength, r * squareLength, squareLength, squareLength);
  } else if (tileType === TILE_TYPE.FOOD_STORAGE) {
    canvasContext.drawImage(tileTypeToImage.get(TILE_TYPE.FOOD_STORAGE), c * squareLength, r * squareLength);
  } else if (tileType === TILE_TYPE.FOOD_FARM) {
    canvasContext.drawImage(tileTypeToImage.get(TILE_TYPE.FOOD_FARM), c * squareLength, r * squareLength);
  } else if (tileType === TILE_TYPE.CAPITAL) {
    // Green square.
    canvasContext.fillStyle = "green";
    canvasContext.fillRect(c * squareLength, r * squareLength, squareLength, squareLength);
  } else if (tileType === TILE_TYPE.ENEMY_CAMP) {
    // Red square.
    canvasContext.fillStyle = "red";
    canvasContext.fillRect(c * squareLength, r * squareLength, squareLength, squareLength);
  }
}

// A subtile is a smaller tile within a grid of tiles in a squareLengthxsquareLength tile.
function _drawRectangleInSubtile(canvasContext, tileTopLeftC, tileTopLeftR, subtileTopLeftC, subtileTopLeftR, width, height) {
  canvasContext.fillRect(
    tileTopLeftC * squareLength + subtileTopLeftC,
    tileTopLeftR * squareLength + subtileTopLeftR,
    width, height
  );
}

function _drawSocietyTable(society, l, w, dl, dw, topLeftX, topLeftY, tableWidthPx, tileUnitsInDisplay) {
  tileUnitsInDisplay.length = 0;
  let currTopLeftY = 0;

  for (const [role, {units}] of society) {
    const bgColor = roleToBgColor.get(role);
    currTopLeftY += _drawUnitsTable(units, l, w, dl, dw, topLeftX, currTopLeftY, tableWidthPx, bgColor, tileUnitsInDisplay);
  }
}


// Draws a 2D grid of units that are in the given tile, with each unit having a
// vertical length l, width w, vertical gap dl, and horizontal gap dw, with the
// grid having the top left (X, Y) px coordinates as topLeftX and topLeftY
// respectively, and a total width of tableWidthPx.
// Returns the height of the table.
function _drawUnitsTable(units, l, w, dl, dw, topLeftX, topLeftY, tableWidthPx, bgColor = false, refGrid = false) {
  if (units.length === 0) {
    return topLeftY;
  }
  
  const maximumX = topLeftX + tableWidthPx;
  
  // Row and column position in px of the unit to be drawn.
  let rr = 0;
  let cc = 0;

  if (refGrid) {
    refGrid.push([]);
  }

  if (bgColor) {
    // Colours the entire row
    canvasContext.fillStyle = bgColor;
    canvasContext.fillRect(topLeftX + cc, topLeftY + rr, tableWidthPx, w)
  }

  for (const unit of units) {
    // Reset if putting the current unit into the current row will go past maximumX.
    if (topLeftX + cc + unitInTileUIInfo.w >= maximumX) {
      cc = 0;
      rr += l + dl;

      if (refGrid) {
	refGrid.push([]);
      }

      if (bgColor) {
	// Colours the entire row
	canvasContext.fillStyle = bgColor;
	canvasContext.fillRect(topLeftX + cc, topLeftY + rr, tableWidthPx, w + dw)
      }

    }

    _drawUnit(unit, topLeftX + cc, topLeftY + rr, l, w);

    if (refGrid) {
      refGrid[refGrid.length - 1].push(unit);
    }
    
    cc += w + dw;
  }

  return rr + l + dl;
}

// Ideally, l should be divisible by 6, and l divisible by 8.
function _drawUnit(unit, topLeftX, topLeftY, l, w) {
  const mainColorComponent = 255;
  const otherColorComponents = 200 - 200 * (unit.energy / 100);

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
