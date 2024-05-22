// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for handling all user inputs, including mouse and keyboard.

// ================================================================================
// DEPENDENCIES
// ================================================================================

// buildTileUIInfo, unitsInTileUIInfo from ui/gui-defs.js
// This is for knowing whether a mouse position is inside a particular GUI's
// region.

// world, selectBuildTile from logic.js

// EVERYTHING from input-constants.js

// ================================================================================
// DATA DEFINITIONS
// ================================================================================
// The position the mouse is currently at in pixel coordinates.
let mouseX, mouseY;
let mouseDownPos, mouseUpPos;  // pos is a {x: Integer, y: Integer}, in px coords

// ================================================================================
// FUNCTIONS
// ================================================================================

// Ought to be called in main.js in window.onload, and after initializeDraw.
function initializeInput(canvas0) {
  const canvas = canvas0;
  const rect = canvas.getBoundingClientRect();
  const root = document.documentElement;

  canvas.addEventListener("click", _onMouseClick);
  canvas.addEventListener("mousedown", _onMouseDragStart);
  canvas.addEventListener("mouseup", _onMouseDragEnd);
  document.addEventListener("keydown", _onKeyDown);

  function _onMouseClick(evt) {
    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;

    // CLEANUP(marvin): Remove debug line before ship.
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
	       mouseDownPos.x >= unitsInTileUIInfo.topLeftX &&
	       mouseDownPos.y >= unitsInTileUIInfo.topLeftY) {
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
    evt.preventDefault();

    if (evt.keyCode == KEY_1) {
      changeClickMode(CLICK_MODE.INFO);
    } else if (evt.keyCode == KEY_2) {
      changeClickMode(CLICK_MODE.BUILD);
    }
  }
}
