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
const FRAMES_PER_SECOND = 10;
const GAME_LOGIC_FRAMES_PER_SECOND = 1;

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

let frame = 1;
let frameTimestamp = "";
let framesThisTimestamp = 0;

// This has to be a separate function so that we can pass it into the preStart
// function as a callback.
function _gameStart() {
  // Run first onTick
  onTick();

  // The event loop (every frame: the world, and draw everything), assumes that
  // input-handling happens before onTick and onDraw when a new frame is being loaded.
  setInterval(function() {
    onDraw();

    // The game logic update should happen every few frames instead of every frame
    if(!gamePaused && (frame % (FRAMES_PER_SECOND/GAME_LOGIC_FRAMES_PER_SECOND) < 1)){
      onTick();

      // Reset frame variable to avoid an infinite counter
      if(frame >= FRAMES_PER_SECOND){
        frame = (frame - FRAMES_PER_SECOND);
      }
    }
    if(!gamePaused){
      frame++;
    }

    if(gamePaused){
      // Pause Screen
      drawTintedRect(0.6, "black", 0, 0, canvas.width, canvas.height)
      centerBox(canvas.width/2, canvas.height/2, 350, 100, "black")
      centerText("Press P to unpause", canvas.width/2, canvas.height/2, "white", "30")
    }

  }, 1000/FRAMES_PER_SECOND);  
}
