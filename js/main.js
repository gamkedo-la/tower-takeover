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

  _gameStart();
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
    onTick();
    onDraw();
  }, 1000/FRAMES_PER_SECOND);  
}
