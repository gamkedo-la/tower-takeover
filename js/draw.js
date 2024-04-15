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

// world from logic.js

// ================================================================================
// DATA DEFINITIONS
// ================================================================================

// These two should only be set by initializeContext function.
// They cannot be const because they are not initialized when the module gets
// initialized as they have to wait for window.onload.
let canvas, canvasContext;

// ================================================================================
// FUNCTION
// ================================================================================

function initializeCanvas(canvas0) {
  canvas = canvas0;
  canvasContext = canvas.getContext('2d');
}

// Observes the world from the logic module, ideally without changing it.
// Assumes that initializeCanvas has been called.
function onDraw() {
  // Drawing the tiles.
  for (let r = 0; r < world.grid.length; r++) {
    for (let c = 0; c < world.grid[r].length; c++) {
      const tile = world.grid[r][c];

      // Draw a tile, given row and column position.
      if (Array.isArray(tile)) {
	// White square first, with units on top. Fit as many units as possible.
	canvasContext.fillStyle = "white";
	canvasContext.fillRect(c * 32, r * 32, 32, 32);

	// Row and column position in pixels of the unit to be drawn within the
	// tile.
	let rr = 0;
	let cc = 0;
	// The length and width of a unit is 9x9, with a one pixel space between
	// them.
	let l = 9;
	let w = 9;
	let dl = l + 1;
	let dw = w + 1;

	for (let i = 0; i < tile.length; i++) {
	  // Draw a unit, with rr, cc, l, w, dl, dw as accumulators.
	  const unit = tile[i];
	  if (cc >= 32) {
	    cc = 0;
	    rr += dl;
	  }

	  const rbColor = 255 - 255 * (unit.energy / 100);
	  // If yours, color green, if enemy, color red.
	  if (unit.affiliation === AFFILIATION.YOURS) {
	    canvasContext.fillStyle = `rgb(${rbColor}, 255, ${rbColor})`;
	  } else if (unit.affiliation === AFFILIATION.ENEMY) {
	    canvasContext.fillStyle = `rgb(255, ${rbColor}, ${rbColor})`;
	  }
	  canvasContext.fillRect(c * 32 + cc, r * 32 + rr, l, w);

	  // If the unit is carrying food, the middle pixel is orange.
	  if (unit.isCarryingFood) {
	    canvasContext.fillStyle = "orange";
	    canvasContext.fillRect(c * 32 + cc + 5, r * 32 + rr + 5, 1, 1);
	  }
	  
	  cc += dw;
	}
      } else if (tile.tag === TILE_TYPE.WALL) {
	// Black square.
	canvasContext.fillStyle = "black";
	canvasContext.fillRect(c * 32, r * 32, 32, 32);
      } else if (tile.tag === TILE_TYPE.FOOD_STORAGE) {
	// Blue square.
	canvasContext.fillStyle = "blue";
	canvasContext.fillRect(c * 32, r * 32, 32, 32);
      } else if (tile.tag === TILE_TYPE.FOOD_FARM) {
	// Orange square.
	canvasContext.fillStyle = "orange";
	canvasContext.fillRect(c * 32, r * 32, 32, 32);
      } else if (tile.tag === TILE_TYPE.CAPITAL) {
	// Green square.
	canvasContext.fillStyle = "green";
	canvasContext.fillRect(c * 32, r * 32, 32, 32);
      } else if (tile.tag === TILE_TYPE.ENEMY_CAMP) {
	// Red square.
	canvasContext.fillStyle = "red";
	canvasContext.fillRect(c * 32, r * 32, 32, 32);
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
}
