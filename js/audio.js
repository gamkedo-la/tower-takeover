// ======================================================================
// MODULE INTERFACE
// ======================================================================

// Responsible for allowing external modules to play sound effects and music
// just by providing the string name. Users can add more sound effects by
// modifying the `nameToFilePath` constant.

// ======================================================================
// DATA DEFINITIONS
// ======================================================================


const soundFolderRoot = "sound/";

// List of pairs, where the left-hand of the pair is the name of the SFX to be
// used throughout the codebase, and the right-hand of the pair is the path to
// the file (including the file itself) relative to `soundFolderRoot`. That is,
// you do not have to write `soundFolderRoot` in the file path.
const nameToFilePath = [
  ["building_built", "building_built.mp3"],
  ["building_denied", "building_denied.mp3"],
];

const nameToAudio = new Map(
  nameToFilePath.map(p => [p[0], new Audio(soundFolderRoot + p[1])])
);


// ======================================================================
// FUNCTIONS
// ======================================================================

// playSFX : String -> Void
// Plays the sound effect with the given name.
function playSFX(name) {
  const audio = nameToAudio.get(name);
  audio.currentTime = 0;
  audio.play();
}
