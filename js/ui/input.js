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
let gamePaused = false;
let gameMuted = false;

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
    if(gamePaused){
      return;
    }

    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;

    // CLEANUP(marvin): Remove debug line before ship.
    document.getElementById("debugText").innerHTML = `click: (${mouseX}, ${mouseY})`;

    if (world.selectedUnits.length > 0) {
      for (let r = 0; r < world.grid.length; r++) {
	for (let c = 0; c < world.grid[r].length; c++) {
	  if (mouseY >= r * squareLength &&
	      mouseY <= (r + 1) * squareLength &&
	      mouseX >= c * squareLength &&
	      mouseX <= (c + 1) * squareLength) {
	    directSelectedUnitsToOneOffPath(r, c);
	    clearSelectedUnits();
	  }
	}
      }
    } else if (world.clickMode == CLICK_MODE.INFO) {
      // Check if the click happens inside a map tile.
      for (let r = 0; r < world.grid.length; r++) {
	for (let c = 0; c < world.grid[r].length; c++) {
	  if (mouseY >= r * squareLength &&
	      mouseY <= (r + 1) * squareLength &&
	      mouseX >= c * squareLength &&
	      mouseX <= (c + 1) * squareLength) {
	    selectMapTile(r, c);
	  }
	}
      }

      // Check if the click happens inside the tile in units display.

      if (mouseX >= unitsInTileUIInfo.topLeftX &&
	  mouseY >= unitsInTileUIInfo.topLeftY) {
	// Normalize the values so that they are in logical position relative to
	// the top left of the units in tile UI.
	const x = Math.floor((mouseX - unitsInTileUIInfo.topLeftX) / unitInTileUIInfo.l);
	const y = Math.floor((mouseY - unitsInTileUIInfo.topLeftY) / unitInTileUIInfo.w);
	if (y <= tileUnitsInDisplay.length - 1 && x <= tileUnitsInDisplay[y].length - 1) {
	  const possibleUnitInCell = tileUnitsInDisplay[y][x];  // Can be undefined
	  if (possibleUnitInCell != undefined) {
	    selectUnit(possibleUnitInCell);
	  }
	}
      }
    } else if (world.clickMode == CLICK_MODE.BUILD) {
      // Check if the click happens to be inside a building select.
      // If so, log the selected building.
      // Deduce screen region from build tiles and log the tile type if click
      // within a region. Otherwise, do nothing.
      for (let i = 0; i < buildTileUIInfo.buildTiles.length; i++) {
	if (mouseY >= buildTileUIInfo.topLeftR * squareLength &&
	    mouseY <= (buildTileUIInfo.topLeftR + 1) * squareLength &&
	    mouseX >= (buildTileUIInfo.topLeftC + i) * squareLength &&
	    mouseX <= (buildTileUIInfo.topLeftC + i + 1) * squareLength) {
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
	    if (mouseY >= r * squareLength &&
		mouseY <= (r + 1) * squareLength &&
		mouseX >= c * squareLength &&
		mouseX <= (c + 1) * squareLength) {
	      changeMapTile(r, c, world.buildTileSelected);
	    }
	  }
	}
      }
    }
  }

  function _onMouseDragStart(evt) {
    if(gamePaused){
      return;
    }

    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;
    mouseDownPos = {x: mouseX, y: mouseY};
    // TODO: Unselect units only if the user click on an invalid tile or outside
    // of map. 
    // clearSelectedUnits();
  }

  function _onMouseDragEnd(evt) {
    if(gamePaused){
      return;
    }

    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;
    mouseUpPos = {x: mouseX, y: mouseY};

    // If not drag, don't treat as drag.
    if (mouseDownPos.x === mouseUpPos.x && mouseDownPos.y === mouseUpPos.y) {
      return;
    }

    // Here, we evaluate the drag
    if (mouseDownPos.x <= (world.grid[0].length + 1) * squareLength &&
	mouseDownPos.y <= (world.grid.length + 1) * squareLength) {
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

      // Normalize the values so that they are in logical position relative to
      // the top left of the units in tile UI.
      const [nStartX, nEndX, nStartY, nEndY] = [
	Math.floor((startX - unitsInTileUIInfo.topLeftX) / unitInTileUIInfo.l),
	Math.floor((endX - unitsInTileUIInfo.topLeftX) / unitInTileUIInfo.l),
	Math.floor((startY - unitsInTileUIInfo.topLeftY) / unitInTileUIInfo.w),
	Math.floor((endY - unitsInTileUIInfo.topLeftY) / unitInTileUIInfo.w),
      ]

      for (let x = nStartX; x <= nEndX; x++) {
	for (let y = nStartY; y <= nEndY; y++) {
 	  if (y <= tileUnitsInDisplay.length - 1 && x <= tileUnitsInDisplay[y].length - 1) {
	    const possibleUnitInCell = tileUnitsInDisplay[y][x];  // Can be undefined
	    if (possibleUnitInCell != undefined) {
	      selectUnit(possibleUnitInCell);
	    }
	  }

	}
      }
    }
  }

  function _onKeyDown(evt) {
    if(gamePaused && evt.keyCode != KEY_P){
      return;
    }

    evt.preventDefault();

    if (evt.keyCode == KEY_1) {
      changeClickMode(CLICK_MODE.INFO);
    } else if (evt.keyCode == KEY_2) {
      changeClickMode(CLICK_MODE.BUILD);
    } else if (evt.keyCode == KEY_P){
      // Toggle pause
      gamePaused = !gamePaused;
      console.log("Game Paused")
    } else if (evt.keyCode == KEY_M) {
      // Toggle mute
      gameMuted = !gameMuted;
      console.log(gameMuted ? "Game audio muted" : "Game audio unmuted")
    }
  }
}
