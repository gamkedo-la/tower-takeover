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
var firstClickEver = true; // used to stop sounds from playing until permitted

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
  canvas.addEventListener("mousemove", _onMouseMove);
  canvas.addEventListener("mouseup", _onMouseDragEnd);
  document.addEventListener("keydown", _onKeyDown);

  function _onMouseClick(evt) {
    if (firstClickEver) {
        firstClickEver = false;
        playSFX("bgm_01",0.5,true);
    }

    if(gamePaused){
      playSFX("button_click_fail");
      return;
    }

    // TODO: play different sounds below depending on result
    playSFX("button_click_ok");

    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;

    // CLEANUP(marvin): Remove debug line before ship.
    document.getElementById("debugText").innerHTML = `click: (${mouseX}, ${mouseY})`;

    // Change modes
    for (let i = 0; i < modeUIInfo.clickModes.length; i++) {
      if (mouseY >= modeUIInfo.topLeftY &&
	  mouseY < modeUIInfo.topLeftY + modeUIInfo.h &&
	  mouseX >= modeUIInfo.topLeftX + (i * modeUIInfo.w) &&
	  mouseX < modeUIInfo.topLeftX + ((i + 1) * modeUIInfo.w)) {
	const clickMode = modeUIInfo.clickModes[i];
	changeClickMode(clickMode);

        // Anything underneath shouldn't be registered.
        return;
      }
    }

    const { buttonWidth, buttonHeight, horizontalGapBetweenButtons, verticalGapBetweenButtons } = nextRoleUIInfo;
    for (let i = 0; i < selectableRoleKeys.length; i++) {
      const targetX = startOfNextRoleButtonsX + (buttonWidth + horizontalGapBetweenButtons) * (i % 2);
      const targetY = startOfNextRoleButtonsY + (buttonHeight + verticalGapBetweenButtons) * Math.floor(i / 2);
      if (mouseX > targetX && mouseX < targetX + buttonWidth
        && mouseY > targetY && mouseY < targetY + buttonHeight) {
        selectedNextRole = ROLE[selectableRoleKeys[i]];
        break;
      }
    }
  
    if (world.selectedUnits.length > 0) {
      // If there are selected units, behaviour based on click mode.
      // INFO: same as ONE_OFF_PATH
      // BUILD: does not apply
      // ONE_OFF_PATH: direct selected units to one off path
      // ONE_END_CYCLIC_PATH: Similar to ONE_OFF_PATH, but is a cyclic path
      //                      instead.
      // TWO_END_CYCLIC_PATH: User must click on another tile before it is in effect.
      for (let r = 0; r < world.grid.length; r++) {
        for (let c = 0; c < world.grid[r].length; c++) {
          if (mouseY >= r * squareLength &&
              mouseY <= (r + 1) * squareLength &&
              mouseX >= c * squareLength &&
              mouseX <= (c + 1) * squareLength) {
	    switch (world.clickMode) {
	    case CLICK_MODE.INFO:
	    case CLICK_MODE.ONE_OFF_PATH:
	      directSelectedUnitsToOneOffPath(r, c);
	      clearSelectedUnits();
	      break;
	    case CLICK_MODE.ONE_END_CYCLIC_PATH:
	      // Assume that all the selected units are not moving, and there's
	      // no way to select units from the multiple positions at the same
	      // time, so all of their position shoulds be the same.
              if (isValidCyclicEndPoint(r, c)) {
                drawState.cyclicPaths.hasChanged = true;
	        directSelectedUnitsToCyclicPath(world.selectedUnits[0].pos.r, world.selectedUnits[0].pos.c, r, c);
	        clearSelectedUnits();
              }
	      break;
	    case CLICK_MODE.TWO_END_CYCLIC_PATH:
              const { twoEndCyclicPathFirstPos } = world;
              if (isValidCyclicEndPoint(r, c)) {
                if (twoEndCyclicPathFirstPos) {
		  directSelectedUnitsToCyclicPath(twoEndCyclicPathFirstPos.r, twoEndCyclicPathFirstPos.c, r, c);
		  clearSelectedUnits();
		  world.twoEndCyclicPathFirstPos = false;
	        } else {
		  world.twoEndCyclicPathFirstPos = { r: r, c: c };
	        }
              }
	      break;
	    }
          }
        }
      }
    } else if (world.clickMode === CLICK_MODE.INFO ||
	       world.clickMode === CLICK_MODE.ONE_OFF_PATH ||
	       world.clickMode === CLICK_MODE.ONE_END_CYCLIC_PATH) {
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
      for (let i = 0; i < world.buildTileOptions.length; i++) {
        if (mouseX >= buildTileUIInfo.topLeftX + i * squareLength &&
            mouseX < buildTileUIInfo.topLeftX + (i + 1) * squareLength &&
            mouseY >= buildTileUIInfo.topLeftY &&
            mouseY < buildTileUIInfo.topLeftY + squareLength) {
          const buildTile = world.buildTileOptions[i];
          selectBuildTile(buildTile);
        }
      }

      // Check if select dynamite.
      if (mouseX >= buildTileUIInfo.dynamiteTopLeftX &&
          mouseX < buildTileUIInfo.dynamiteTopLeftX + squareLength &&
          mouseY >= buildTileUIInfo.dynamiteTopLeftY &&
          mouseY < buildTileUIInfo.dynamiteTopLeftY + squareLength) {
        toggleDynamite();
      }

      // Build tile functionality.
      for (let r = 0; r < world.grid.length; r++) {
        for (let c = 0; c < world.grid[r].length; c++) {
          if (mouseY >= r * squareLength &&
              mouseY <= (r + 1) * squareLength &&
              mouseX >= c * squareLength &&
              mouseX <= (c + 1) * squareLength) {
            modifyTileUsingBuildSettings(r, c);
          }
        }
      }
    } else if (world.clickMode === CLICK_MODE.TWO_END_CYCLIC_PATH) {
      // At this point, there are no selected units.
      for (let r = 0; r < world.grid.length; r++) {
        for (let c = 0; c < world.grid[r].length; c++) {
          if (mouseY >= r * squareLength &&
              mouseY <= (r + 1) * squareLength &&
              mouseX >= c * squareLength &&
              mouseX <= (c + 1) * squareLength) {
            if (isValidCyclicEndPoint(r, c)) {
              const { twoEndCyclicPathFirstPos } = world;
              if (twoEndCyclicPathFirstPos) {
                drawState.cyclicPaths.hasChanged = true;
	        createCyclicPath(twoEndCyclicPathFirstPos.r, twoEndCyclicPathFirstPos.c, r, c);
	        world.twoEndCyclicPathFirstPos = false;
	      } else {
	        world.twoEndCyclicPathFirstPos = { r: r, c: c };
	      }
            }
          }
        }
      }
    }

    // In any mode, clicking on a redX in path UI display should destroy the
    // path.
    for (const pathBoxUIInfo of drawState.cyclicPaths.pathBoxUIInfos) {
      const { deleteUIInfo:{ topLeftX, topLeftY, w, h }, path } = pathBoxUIInfo;

      if (mouseX >= topLeftX &&
          mouseX < topLeftX + w &&
          mouseY >= topLeftY &&
          mouseY < topLeftY + h) {
        drawState.cyclicPaths.hasChanged = true;
        destroyCyclicPath(path);
      }
    }

    mouseDownPos = null;
  }

  function _onMouseDragStart(evt) {
    if(gamePaused){
      return;
    }

    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;
    mouseDownPos = {x: mouseX, y: mouseY};
    // Unselect units only if the user click on an invalid tile or outside
    // of map.

    if (mouseX > mapUIInfo.w || mouseY > mapUIInfo.h) {
      clearSelectedUnits();
    }
  }

  function _onMouseMove(evt) {
    mouseX = evt.clientX - rect.left - root.scrollLeft;
    mouseY = evt.clientY - rect.top - root.scrollTop;

    // If hover over a path in pathUI, give that path box a light blue
    // background and draw that path on the map.
    world.selectedPath = false;  // By default, no selected path.
    const { pathBoxUIInfos } = drawState.cyclicPaths;
    for (const pathBoxUIInfo of pathBoxUIInfos) {
      const { topLeftX, topLeftY, w, h, path } = pathBoxUIInfo;

      if (mouseX >= topLeftX &&
          mouseX < topLeftX + w &&
          mouseY >= topLeftY &&
          mouseY < topLeftY + h) {

        world.selectedPath = path;
        
        // The boxes are mutually exclusive, so we can stop.
        break;
      }
    }
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
    } else if ((world.clickMode === CLICK_MODE.INFO ||
		world.clickMode === CLICK_MODE.ONE_OFF_PATH ||
		world.clickMode === CLICK_MODE.ONE_END_CYCLIC_PATH ||
		world.clickMode === CLICK_MODE.TWO_END_CYCLIC_PATH) &&
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
    mouseDownPos = null;
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
    } else if (evt.keyCode == KEY_3) {
      changeClickMode(CLICK_MODE.ONE_OFF_PATH);
    } else if (evt.keyCode == KEY_4) {
      changeClickMode(CLICK_MODE.ONE_END_CYCLIC_PATH);
    } else if (evt.keyCode == KEY_5) {
      changeClickMode(CLICK_MODE.TWO_END_CYCLIC_PATH);
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
