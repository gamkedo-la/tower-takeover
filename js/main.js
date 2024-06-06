// ================================================================================ 
// MODULE INTERFACE
// ================================================================================
// Responsible for handling the event loop and serves as the entry point for the
// game. None of the functions or variables below need to be used by modules
// other than this one. The only way this file needs to be used is by adding it
// to the list of scripts in the index.html file (like any other js files.)

// ================================================================================
// DEPENDENCIES
// ================================================================================
// onTick() from logic.js
// onDraw(), initializeDraw() from draw.js
// document from The HTML DOM

// ================================================================================
// CONSTANTS
// ================================================================================
const FRAMES_PER_SECOND = 1;

// ================================================================================
// IMPLEMENTATION
// ================================================================================

window.onload = function() {
  const canvas = document.getElementById('gameCanvas');
  initializeDraw(canvas);
  initializeInput(canvas);

  _prepareGameStart(_gameStart);

  // Called by prepareGameStart, when it was also called here, setInterval got hit twice
  // _gameStart();
}

// NOTE(marvin): Consider moving all this to its own file.
const rootImagesFolder = "images/";
let tileTypeToImage = new Map();

function _prepareGameStart(callback) {
  const tileImages = [
    {tileType: TILE_TYPE.FOOD_STORAGE, filename: "foodStorage.png"},
  ];

  let numImagesLeftToLoad = tileImages.length;

  for (const tileImage of tileImages) {
    const imgElement = document.createElement("img");
    imgElement.onload = function () {
      numImagesLeftToLoad--;

      if (numImagesLeftToLoad === 0) {
	callback();
      }
    }
    imgElement.src = rootImagesFolder + tileImage.filename;

    tileTypeToImage.set(tileImage.tileType, imgElement);
  }
}

// This has to be a separate function so that we can pass it into the preStart
// function as a callback.
function _gameStart() {
  // The event loop (every frame: the world, and draw everything), assumes that
  // input-handling happens before onTick and onDraw when a new frame is being loaded.
  setInterval(function() {
    if(!gamePaused){
      onTick();
      onDraw();
    }
    else
    {
      // Draw pause screen
      onDraw();
      canvasContext.globalAlpha = 0.2;
      canvasContext.fillStyle = "red";
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      canvasContext.globalAlpha = 1.0;

      var boxW = 350;
      var boxH = 100;
      canvasContext.fillStyle = "black";
      canvasContext.fillRect(canvas.width/2 - boxW/2, canvas.height/2 - boxH/2, boxW, boxH);
      canvasContext.fillStyle = "white";
      var alignWas = canvasContext.textAlign;
      canvasContext.textAlign = "center";
      var fontWas = canvasContext.font;
      canvasContext.font = "30px Arial"
      canvasContext.fillText("Press P to unpause", canvas.width/2, canvas.height/2);
      canvasContext.textAlign = canvasContext.textAlign;
      canvasContext.font = fontWas;
    }
  }, 1000/FRAMES_PER_SECOND);  
}