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
// onDraw() from draw.js
// document from The HTML DOM

// ================================================================================
// CONSTANTS
// ================================================================================
int FRAMES_PER_SECOND = 30;

// ================================================================================
// IMPLEMENTATION
// ================================================================================

window.onload = function() {
  var canvas = document.getElementById('gameCanvas');
  var canvasContext = canvas.getContext('2d');

  // Initialize input.
  // Currently empty, add this in later.

  // The event loop (every frame: the world, and draw everything), assumes that
  // input-handling happens before onTick and onDraw when a new frame is being loaded.
  setInterval(function() {
    onTick();
    onDraw();
  }, 1000/FRAMES_PER_SECOND);
}
