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


let selectableRoleKeys = ['FARMER', 'SOLDIER'];
let startOfNextRoleButtonsX = Infinity;
let startOfNextRoleButtonsY = Infinity;


const roleToBgColor = new Map([
  [ROLE.FARMER, 'rgb(255, 178, 102)'],
  [ROLE.SOLDIER, 'rgb(51, 153, 255)'],
  [ROLE.WALKER, 'rgb(51, 153, 255)'],
  [ROLE.QUEEN, 'rgb(255, 255, 153)'],
  [ROLE.ATTACKER, 'rgb(0, 0, 0)'],  // Enemies will be red, so the background
				    // shouldn't be
]);

const tileTypeToColor = new Map([
  [TILE_TYPE.UNASSIGNED, 'black'],
  [TILE_TYPE.WALL, 'black'],
  [TILE_TYPE.WALKABLE_TILE, 'white'],
  [TILE_TYPE.FOOD_STORAGE, 'blue'],
  [TILE_TYPE.FOOD_FARM, 'orange'],
  [TILE_TYPE.CAPITAL, 'rgb(213, 182, 10)'],  // dark yellow
  [TILE_TYPE.ENEMY_CAMP, 'red'], 
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

  // Drawing the tiles on map.
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      // Draw a tile, given row and column position.
      if (tile.tag === TILE_TYPE.WALKABLE_TILE) {
	// White square first, with units on top. Fit as many units as possible.
	canvasContext.fillStyle = "white";
	canvasContext.fillRect(c * squareLength, r * squareLength, squareLength, squareLength);

	_drawUnitsTable(tile.society.get(ROLE.WALKER).units.concat(tile.society.get(ROLE.ATTACKER).units), 30, 24, 2, 2, c * squareLength, r * squareLength, squareLength);
      } else if (tile.tag === TILE_TYPE.UNDER_CONSTRUCTION) {
        const { resultingTileType } = tile;
        _drawTileTypeAtPos(resultingTileType, c, r, 0.25);
      } else {
	_drawTileTypeAtPos(tile.tag, c, r);
      }
    }
  }

  // Drawing the selected path
  if (world.selectedPath) {
    _drawPath(world.selectedPath);
  }

  if ((world.clickMode === CLICK_MODE.INFO ||
       world.clickMode === CLICK_MODE.ONE_OFF_PATH ||
       world.clickMode === CLICK_MODE.ONE_END_CYCLIC_PATH ||
       world.clickMode === CLICK_MODE.TWO_END_CYCLIC_PATH) &&
      world.mapTileSelected != null) {
    // Window to show units in the selected tile.

    // Pixel positions
    const tile = world.mapTileSelected;

    let nextTopLeftY = _drawSocietyTable(tile.society, 42, 32, 4, 4, unitsInTileUIInfo.topLeftX, unitsInTileUIInfo.topLeftY, 1200 - unitsInTileUIInfo.topLeftX, tileUnitsInDisplay);
    startOfNextRoleButtonsX = unitsInTileUIInfo.topLeftX;
    startOfNextRoleButtonsY = nextTopLeftY;
    nextTopLeftY = _drawNextRoleButtons(unitsInTileUIInfo.topLeftX, nextTopLeftY);
    nextTopLeftY = _drawFoodStored(tile, unitsInTileUIInfo.topLeftX, nextTopLeftY);
    let { topLeftX } = tileStatsUIInfo;
    _drawTileStats(tile, topLeftX, nextTopLeftY);

  } else if (world.clickMode == CLICK_MODE.BUILD) {
    const { topLeftX, topLeftY, dynamiteTopLeftX, dynamiteTopLeftY } = buildTileUIInfo;
    // Draw the build tile options window.
    // These are arbitrary values, tune them as necessary and potentially make
    // their positions dependent on the positions of other UI elements.
    for (let i = 0; i < world.buildTileOptions.length; i++) {
      const buildTile = world.buildTileOptions[i];
      const x = topLeftX + i * squareLength;
      canvasContext.drawImage(tileTypeToImage.get(buildTile),
                              x,
                              topLeftY);

      if (buildTile === world.buildTileSelected) {
        _drawBlueHighlightAtPixels(x, topLeftY);
      }
    }

    // Draw the dynamite.
    const dynamiteImage = nameToImage.get("dynamite");
    canvasContext.drawImage(dynamiteImage, dynamiteTopLeftX, dynamiteTopLeftY);

    // Draw blue outline if dynamite is selected.
    if (world.dynamiteSelected) {
      _drawBlueHighlightAtPixels(dynamiteTopLeftX, dynamiteTopLeftY);
    }
  }

  // Draw the modes.
  // When we draw an image, we add its width to this value, so that we know
  // where to place the next image.
  let clickModeXSoFar = modeUIInfo.topLeftX;
  for (const clickMode of modeUIInfo.clickModes) {
    const clickModeImage = clickModeToImage.get(clickMode);

    // If clickMode is what's selected at the moment, give it a different
    // background.
    if (world.clickMode === clickMode) {
      canvasContext.fillStyle = "white";
      canvasContext.fillRect(clickModeXSoFar, modeUIInfo.topLeftY, clickModeImage.width, clickModeImage.height);
    }

    canvasContext.drawImage(clickModeImage, clickModeXSoFar, modeUIInfo.topLeftY);
    
    clickModeXSoFar += clickModeImage.width;
  }

  _drawPathsUI(cyclicPathsUIInfo, world.cyclicPaths, world.grid);

  _drawMessageGUI();

  if (mouseDownPos) {
    canvasContext.save();
    canvasContext.strokeStyle = 'black';
    canvasContext.strokeRect(mouseDownPos.x, mouseDownPos.y, mouseX - mouseDownPos.x, mouseY - mouseDownPos.y);
    canvasContext.restore();
  }
}

function _drawBlueHighlightAtPixels(x, y) {
  drawTintedRect(0.2, "blue", x, y, squareLength, squareLength);
}

function _drawBlueSquareOutlineAt(r, c) {
  // The canvas stroke rect's line width expands from the middle, which makes
  // the very top left of the outline appear at (c*squareLength-lineWidth/2,
  // r*squareLength-lineWidth/2). Need to add
  const lineWidth = 8;
  const halvedLineWidth = lineWidth / 2;
  
  canvasContext.save();
  canvasContext.strokeStyle = 'rgb(173, 216, 230)';
  canvasContext.lineWidth = lineWidth;
  canvasContext.strokeRect(c * squareLength + halvedLineWidth, r * squareLength + halvedLineWidth,
                           squareLength - lineWidth, squareLength - lineWidth);
  canvasContext.restore();
}

// CyclicPathUIInfo [Array-of CyclicPath] -> Void
function _drawPathsUI(uiInfo, cyclicPaths, grid) {
  const { topLeftX, topLeftY, w } = uiInfo;

  const paddingX = 16;  // In pixels, on each side
  const paddingY = 16;  // In pixels, on each side
  const tileSideLength = 16;  // In pixels
  const midTopLeftX = topLeftX + (w / 2);
  
  let resetX = topLeftX;
  let currX = resetX;
  let currY = topLeftY;

  // We actually store draw computations, so we can just read from
  // those. However, if cyclicPath changes in meaning, then we will need to
  // redraw.

  // TODO: hasChanged needs to be flicked to true whenever world.cyclicPaths
  // changes. A few ways to go about that:
  // - The input responsible for drawing a new cyclicPath needs to also change
  // the drawState.

  const {
    hasChanged: shouldUpdateDrawStateCyclicPaths,
    pathBoxUIInfos
  } = drawState.cyclicPaths;

  const pathBoxW = (w / 2);
  const pathBoxH = (2 * paddingY) + tileSideLength;

  if (shouldUpdateDrawStateCyclicPaths) {
    pathBoxUIInfos.length = 0;
  }

  for (const cyclicPath of cyclicPaths) {
    const { orderedPoss, numFollowers, lastIndex } = cyclicPath;
    const pathLen = lastIndex + 1;

    let pathBoxTopLeftX = currX;
    let pathBoxTopLeftY = currY;

    // Draw a light blue background if selected.
    if (world.selectedPath &&
        cyclicPathEquals(cyclicPath, world.selectedPath)) {
      canvasContext.fillStyle = `rgb(173, 216, 230)`;  // Light blue.
      canvasContext.fillRect(currX, currY, pathBoxW, pathBoxH);

    }

    currX += paddingX;
    currY += paddingY;

    // If go beyond the screen height, go to second column.
    if (currY >= screenHeight) {
      currY = topLeftY + paddingY;
      resetX = midTopLeftX;
      currX = resetX + paddingX;
    }

    // Draw the paths as tiny 16x16 tiles.
    for (let i = 0; i < pathLen; i++) {
      const pos = orderedPoss[i];
      const tile = grid[pos.r][pos.c];
      
      canvasContext.fillStyle = tileTypeToColor.get(tile.tag);
      canvasContext.fillRect(currX, currY, tileSideLength, tileSideLength);

      currX += tileSideLength;
    }

    
    // Draw the delete button
    const redXImage = nameToImage.get("redX");
    const dTLX = topLeftX + (w / 2) - paddingX - redXImage.width;
    const dTLY = pathBoxTopLeftY + paddingY;

    canvasContext.drawImage(redXImage, dTLX, dTLY);

    if (shouldUpdateDrawStateCyclicPaths) {
      pathBoxUIInfos.push({
        topLeftX: pathBoxTopLeftX,
        topLeftY: pathBoxTopLeftY,
        w: pathBoxW,
        h: pathBoxH,
        deleteUIInfo: {
          topLeftX: dTLX,
          topLeftY: dTLY,
          w: redXImage.width,
          h: redXImage.height,
        },
        path: cyclicPath,
      });
    }

    currX = resetX;
    currY += (tileSideLength + paddingY);
  }

  // Since we have just drawn, must be up to date.
  drawState.cyclicPaths.hasChanged = false;
}

function _drawPath(path) {
  canvasContext.strokeStyle = "black";
  canvasContext.lineWidth = 1;

  let prevPos = path.orderedPoss[0];
  
  for (let i = 1; i < path.orderedPoss.length; i++) {
    const currPos = path.orderedPoss[i];
    
    // Connect lines between the center of the tiles.
    canvasContext.beginPath();
    const centerOffset = squareLength / 2 - 1;
    canvasContext.moveTo(prevPos.c * squareLength + centerOffset, prevPos.r * squareLength + centerOffset);
    canvasContext.lineTo(currPos.c * squareLength + centerOffset, currPos.r * squareLength + centerOffset);
    canvasContext.stroke();

    prevPos = currPos;
  }
}

// c and r are in terms of squareLength
function _drawTileTypeAtPos(tileType, c, r, alpha=1) {
  canvasContext.globalAlpha = alpha;
    
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

  canvasContext.globalAlpha = 1;
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
    if (units.length <= 0) {
      continue;
    }
    
    const bgColor = roleToBgColor.get(role);
    currTopLeftY += _drawUnitsTable(units, l, w, dl, dw, topLeftX, currTopLeftY, tableWidthPx, bgColor, tileUnitsInDisplay);
  }

  return currTopLeftY;
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

function _drawNextRoleButtons(topLeftX, topLeftY) {
  const { buttonWidth, buttonHeight, horizontalGapBetweenButtons, verticalGapBetweenButtons } = nextRoleUIInfo;

  let currentY = 0;
  selectableRoleKeys.map((roleKey, index) => {
    if (index % 2 === 0) {
      _drawNextRoleButton(topLeftX, topLeftY + currentY, buttonWidth, buttonHeight, roleKey);
    } else {
      _drawNextRoleButton(topLeftX + buttonWidth + horizontalGapBetweenButtons, topLeftY + currentY, buttonWidth, buttonHeight, roleKey);
      currentY = currentY + buttonHeight + verticalGapBetweenButtons;
    }
  });
  if (selectableRoleKeys.length % 2 > 0) {
    currentY = currentY + buttonHeight + verticalGapBetweenButtons;
  }

  return topLeftY + currentY;
}

function _drawNextRoleButton(x, y, width, height, text) {
  if (selectedNextRole === ROLE[text]) {
    canvasContext.fillStyle = 'green';
  } else {
    canvasContext.fillStyle = 'gray';
  }
  canvasContext.fillRect(x, y, width, height);

  canvasContext.font = "20px Arial";
  canvasContext.fillStyle = "White";
  canvasContext.fillText(text, x, y + 20);
}

function describeSocietyRole(soc,role,desc) {
  let num = 0;
  let cap = 0;
  let sss = ""; // plural
  let rol = soc.get(role);
  if (rol) {
    // account for the fact that some data is undefined or ""
    if (Array.isArray(rol.units)) {
      num = rol.units.length;
    }
    if (!isNaN(rol.capacity) && rol.capacity > 0) cap = rol.capacity;
    if (cap>1) sss = "s";
  }
  return num+" of "+cap+" "+desc+sss;
}

function _drawTileStats(tile, topLeftX, topLeftY) {
  canvasContext.fillStyle = "rgba(0,0,0,0.2)";
  canvasContext.fillRect(topLeftX,topLeftY,300,300);
  canvasContext.font = "24px Arial";
  canvasContext.fillStyle = "White";
  let lineHeight = 24;
  // margin:
  topLeftX += 24;
  topLeftY += 24;
  canvasContext.fillText("Currently Selected Tile: ", topLeftX,topLeftY+=lineHeight);
  canvasContext.fillText("-------------------------------",topLeftX,topLeftY+=lineHeight);
  canvasContext.fillText(/*"Tag: ["+tile.tag+"] "+ */TILE_TYPE_STRING[tile.tag], topLeftX,topLeftY+=lineHeight);
  canvasContext.fillText(/*"Society: "*/"", topLeftX,topLeftY+=lineHeight);
  
  // iterating MAPs is very difficult!
  // console.log(tile.society); // you can't debug log explore a map's contents! yuck
  // tile.society[ROLE.QUEEN].* doesn't work?!?! you have to get() etc - ewwwwwwwwwww
  // and .units can be undefined or not a number instead of zero etc etc etc
  
  canvasContext.fillText(describeSocietyRole(tile.society,ROLE.FARMER,"farmer"),topLeftX,topLeftY+=lineHeight);
  canvasContext.fillText(describeSocietyRole(tile.society,ROLE.SOLDIER,"soldier"),topLeftX,topLeftY+=lineHeight);
  canvasContext.fillText(describeSocietyRole(tile.society,ROLE.WALKER,"walker"),topLeftX,topLeftY+=lineHeight);
  canvasContext.fillText(describeSocietyRole(tile.society,ROLE.QUEEN,"queen"),topLeftX,topLeftY+=lineHeight);
  canvasContext.fillText(describeSocietyRole(tile.society,ROLE.ATTACKER,"attacker"),topLeftX,topLeftY+=lineHeight);

  canvasContext.fillText("-------------------------------",topLeftX,topLeftY+=lineHeight);
}

function _drawFoodStored(tile, topLeftX, topLeftY) {
  const effectiveHeight = 50;
  canvasContext.font = "24px Arial";
  canvasContext.fillStyle = "White";
  let amountString = "0kg"; // default - no food on tile
  if (tile.foodStored != undefined) amountString = tile.foodStored+"kg";
  canvasContext.fillText("Food Stored: " + amountString, topLeftX, topLeftY + 25);
  return topLeftY + effectiveHeight;
}

// --------------------------------------------------------------------------------
// MESSAGE SYSTEM
// --------------------------------------------------------------------------------
// These are functions related to the message system. The data definitions are
// stored in gui-defs.js. The exposed functions are `setMessageForCurrentFrame()`
// (useful for hover) and `setTemporaryMessage(seconds)` to display a temporary
// message for the given number of seconds. If a temporary message is currently
// displayed and you set a new temporary message, the new temporary message will
// replace the old one. The `_drawMessageGUI()` is called internally by draw.js
// every frame.

// Void -> Void
function setMessageForCurrentFrame() {
  console.error("Unimplemented.");
}

// Number -> Void
function setTemporaryMessage(seconds) {
  console.error("Unimplemented.");
}

// Void -> Void
// Order of precedence:
// 1. messageForCurrentFrame
// 2. temporaryMessage
// 3. the message for the current world state (defined in this function body)
function _drawMessageGUI() {
  let textToShowThisFrame = "";
  
  const { message } = drawState;
  
  if (message.messageForCurrentFrame) {
    textToShowThisFrame = message.messageForCurrentFrame;
  } else if (message.temporaryMessage) {
    textToShowThisFrame = message.temporaryMessage;
    message.temporaryMessageShownInFrames += 1;

    // Check if we can stop showing the temporary message for next frame.
    const { temporaryMessageShownInFrames,
            temporaryMessageToShowInSeconds } = message;
    const temporaryMessageShownInSeconds = temporaryMessageShownInFrames * SECONDS_PER_FRAME;
    if (temporaryMessageShownInSeconds > temporaryMessageToShowInSeconds) {
      message.temporaryMessage = false;
    }
  } else {
    // We decide what text to show based on game state.
    textToShowThisFrame = getMessageText(world);
  }

  const { topLeftX, topLeftY, w, fontSize, lineSpacing } = messageUIInfo;
  canvasContext.font = `${fontSize}px Arial`;
  canvasContext.fillStyle = "White";
  _fillWrappedText(textToShowThisFrame, topLeftX, topLeftY + fontSize, w, fontSize, lineSpacing);
}

// String Number Number Number Number Number -> Void
// A wrapper around `CanvasRenderingContext2D: fillText()` that draws text that
// otherwise wouldn't fit onto one line on a new line. However, it can go off
// screen vertically as there is no maximum height. All number arguments are in pixels.
function _fillWrappedText(text, topLeftX, topLeftY, maxWidth, fontSize, lineSpacing) {
  // Implemented inspired by
  // https://stackoverflow.com/questions/2936112/text-wrap-in-a-canvas-element

  const words = text.split(" ");

  // The first word is exempt from the max width.
  let currentLine = words[0];
  let currTopLeftY = topLeftY;

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = canvasContext.measureText(currentLine + " " + word).width;

    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      canvasContext.fillText(currentLine, topLeftX, currTopLeftY, maxWidth);
      currTopLeftY += (fontSize + lineSpacing);
      currentLine = word;
    }
  }

  canvasContext.fillText(currentLine, topLeftX, currTopLeftY, maxWidth);
}
