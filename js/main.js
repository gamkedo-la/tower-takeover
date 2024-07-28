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
const SECONDS_PER_FRAME = 1 / FRAMES_PER_SECOND;
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

const tileTypeToImage = new Map();
const clickModeToImage = new Map();
const nameToImage = new Map();

function _prepareGameStart(callback) {
  // TODO: Arrays should be somewhere in the ui directory.
  const tileImages = [
    {tileType: TILE_TYPE.FOOD_STORAGE, filename: "foodStorage.png"},
    {tileType: TILE_TYPE.FOOD_FARM, filename: "farm.png"},
  ];

  const modeImages = [
    {clickMode: CLICK_MODE.INFO, filename: "modeInfo.png"},
    {clickMode: CLICK_MODE.BUILD, filename: "modeBuild.png"},
    {clickMode: CLICK_MODE.ONE_OFF_PATH, filename: "modeOneOff.png"},
    {clickMode: CLICK_MODE.ONE_END_CYCLIC_PATH, filename: "modeOneEndCyclic.png"},
    {clickMode: CLICK_MODE.TWO_END_CYCLIC_PATH, filename: "modeTwoEndCyclic.png"},
  ];

  const namedImages = [
    {name: "redX", filename: "redX.png"},
    {name: "dynamite", filename: "dynamite.png"},
  ]

  let numImagesLeftToLoad = tileImages.length + modeImages.length + namedImages.length;
  let shouldCallCallback = false;

  // NOTE: The three for loops below are very similar. If there are further
  // additions of image arrays and maps (and what not), definitely consider
  // abstracting.
  for (const tileImage of tileImages) {
    const imgElement = document.createElement("img");

    // If the image element is cached, no need for onload.
    if (imgElement.complete) {
      numImagesLeftToLoad--;
      if (numImagesLeftToLoad === 0) {
	shouldCallCallback = true;
      }
    } else {
      imgElement.onload = function () {
	numImagesLeftToLoad--;

	if (numImagesLeftToLoad === 0) {
	  callback();
	}
      }
    }

    imgElement.src = rootImagesFolder + tileImage.filename;

    tileTypeToImage.set(tileImage.tileType, imgElement);

    if (shouldCallCallback) {
      callback();
    }
  }

  for (const modeImage of modeImages) {
    const imgElement = document.createElement("img");

    // If the image element is cached, no need for onload.
    if (imgElement.complete) {
      numImagesLeftToLoad--;
      if (numImagesLeftToLoad === 0) {
	shouldCallCallback = true;
      }
    } else {
      imgElement.onload = function () {
	numImagesLeftToLoad--;

	if (numImagesLeftToLoad === 0) {
	  callback();
	}
      }
    }

    imgElement.src = rootImagesFolder + modeImage.filename;

    clickModeToImage.set(modeImage.clickMode, imgElement);

    if (shouldCallCallback) {
      callback();
    }
  }

  for (const namedImage of namedImages) {
    const imgElement = document.createElement("img");

    // If the image element is cached, no need for onload.
    if (imgElement.complete) {
      numImagesLeftToLoad--;
      if (numImagesLeftToLoad === 0) {
	shouldCallCallback = true;
      }
    } else {
      imgElement.onload = function () {
	numImagesLeftToLoad--;

	if (numImagesLeftToLoad === 0) {
	  callback();
	}
      }
    }

    imgElement.src = rootImagesFolder + namedImage.filename;

    nameToImage.set(namedImage.name, imgElement);

    if (shouldCallCallback) {
      callback();
    }
  }
}

let frame = 1;

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
