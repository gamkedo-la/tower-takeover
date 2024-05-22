// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for drawing the world using the HTML canvas API so that the
// players can see the game, as well as reading user input from keyboard and
// mouse. Furthermore, this module sometimes takes some liberties in calling the
// module logic's functions, sometimes even changing the world state
// directly. That's not ideal but it gets things running for now. Such liberties
// should only be taken inside the input callback functions in
// initializeCanvas. There will come a day where those callback functions are
// defined else where.
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
let mouseDownPos, mouseUpPos;  // pos is a {x: Integer, y: Integer}

// A BuildTileUIInfo is a (topLeftC: Number, topLeftR: Number, buildTiles:
// [List-of TileType]) which represents
// (top left column in logical positioning, top left row in logical
// positioning).
const buildTileUIInfo = {
  topLeftC: 1,
  topLeftR: 5,
  buildTiles: world.buildTileOptions,
}

const tileUnitsUIInfo = {
  topLeftX: 800,
  topLeftY: 0,
}

let tileUnitsInDisplay = [];  // 2D array, rebuilt every frame

// ================================================================================
// FUNCTIONS
// ================================================================================

// TODO(marvin): Move the input callback functions elsewhere. Still need access
// to the view's data definitions. Perhaps have a module called UI, which
// contains input handling as well as placement of GUI blocks.

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

  function _onMouseDragStart(evt) {
    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;
    mouseDownPos = {x: mouseX, y: mouseY};
    clearSelectedUnits();
  }

  function _onMouseDragEnd(evt) {
    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;
    mouseUpPos = {x: mouseX, y: mouseY};

    // If not drag, don't treat as drag.
    if (mouseDownPos.x === mouseUpPos.x && mouseDownPos.y === mouseUpPos.y) {
      return;
    }

    // Here, we evaluate the drag
    if (mouseDownPos.x <= (world.grid[0].length + 1) * 32 &&
        mouseDownPos.y <= (world.grid.length + 1) * 32) {
      // First mousedown inside map
      console.log("DRAG INSIDE MAP");
    } else if (world.clickMode == CLICK_MODE.INFO &&
	       mouseDownPos.x >= tileUnitsUIInfo.topLeftX &&
	       mouseDownPos.y >= tileUnitsUIInfo.topLeftY) {
      // First mousedown inside tile units display
      console.log("DRAG INSIDE TILE UNITS DISPLAY");
      const cornerPos1 = mouseDownPos;
      const cornerPos2 = mouseUpPos;
      const [ startX, endX ] = cornerPos1.x <= cornerPos2.x
	? [ cornerPos1.x, cornerPos2.x ]
	: [ cornerPos2.x, cornerPos1.x ];
      const [ startY, endY ] = cornerPos1.y <= cornerPos2.y
	    ? [ cornerPos1.y, cornerPos2.y ]
	    : [ cornerPos2.y, cornerPos1.y ];

      for (let x = Math.ceil(startX); x <= Math.floor(endX); x++) {
	for (let y = Math.ceil(startY); y <= Math.floor(endY); y++) {
	  if (y <= tileUnitsInDisplay.length - 1 && x <= tileUnitsInDisplay[y].length - 1) {
	    const possibleUnitInCell = tileUnitsInDisplay[y][x];  // Can be undefined
	    if (possibleUnitInCell != undefined) {
	      possibleUnitInCell.isSelected = true;
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
  canvas.addEventListener("mousedown", _onMouseDragStart);
  canvas.addEventListener("mouseup", _onMouseDragEnd);
  document.addEventListener("keydown", _onKeyDown);
}

// Assumes that given pixel position is inside tile units display.
function convertPxPosToLogicalPosInTileUnitsDisplay(pxPos) {
  const posRelativeToTopLeft = {
    x: pxPos.x - tileUnitsUIInfo.topLeftX,
    y: pxPos.y - tileUnitsUIInfo.topLeftY
  };

  const maxPosRelativeToTopLeft = {
    x: 1200 - tileUnitsUIInfo.topLeftX,
    y: 680 - tileUnitsUIInfo.topLeftY,
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

// TODO(marvin): Make executable test cases.
// (5, 5) -> (0, 0)
// (18, 24) -> (0, 0)
// (19, 24) -> (0.5, 0)
// (18, 25) -> (0, 0.5)
// (19, 25) -> (0.5, 0.5)
// (22, 28) -> (0.5, 0.5)

// (23, 29) -> (1, 1)
// (40, 52) -> (1, 1)
// (51, 53) -> (1.5, 1.5)
// (44, 56) -> (1.5, 1.5)
// (45, 57) -> (2, 2)

// (100, 436) -> (5, 16)


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

	// TODO(marvin): Make a drawUnitTable function, generalizes the one used
	// in drawing the unitsInTileDisplay as well. Apply the abstraction
	// recipe.
	
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

    // Pixel positions
    const tile = world.mapTileSelected;
    tileUnitsInDisplay = [[]];  // 2D array

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
      const dl = 4;
      const dw = 4;

      for (let i = 0; i < tile.length; i++) {
	// Draw a unit, with rr, cc, l, w, dl, dw as accumulators.
	const unit = tile[i];

	// If off the screen, wrap around.
	if (cc >= 1200) {
	  cc = 0;
	  rr += dl;

	  tileUnitsInDisplay.push([]);
	}

	const mainColorComponent = 155 + 100 * (unit.energy / 100);
	const otherColorComponents = 255 - 255 * (unit.energy / 100);

	if (unit.isSelected) {
	  canvasContext.fillStyle = `rgb(173, 216, 230)`;  // Light blue.
	  // Fill the entire cell.
	  canvasContext.fillRect(
	    tileUnitsUIInfo.topLeftX + cc,
	    tileUnitsUIInfo.topLeftY + rr,
	    l,
	    w,
	  );
	  
	}

	if (unit.affiliation === AFFILIATION.YOURS) {
	  canvasContext.fillStyle = `rgb(${otherColorComponents}, ${mainColorComponent}, ${otherColorComponents})`;
	} else if (unit.affiliation === AFFILIATION.ENEMY) {
	  canvasContext.fillStyle = `rgb(${mainColorComponent}, ${otherColorComponents}, ${otherColorComponents})`;
	}

	canvasContext.fillRect(tileUnitsUIInfo.topLeftX + cc + 4, tileUnitsUIInfo.topLeftY + rr, 16, 9);
	canvasContext.fillRect(tileUnitsUIInfo.topLeftX + cc, tileUnitsUIInfo.topLeftY + rr + 12, 24, 20);

	if (unit.isCarryingFood) {
	  canvasContext.fillStyle = "orange";
	  canvasContext.fillRect(tileUnitsUIInfo.topLeftX + cc + 8, tileUnitsUIInfo.topLeftY + rr + 16, 8, 8);
	}

	tileUnitsInDisplay[tileUnitsInDisplay.length - 1].push(unit);

	cc += dw;
      }
      
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
