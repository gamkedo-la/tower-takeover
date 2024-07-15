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
  ["building_destroyed", "Sx_Building_Destroy.wav"],
  ["path_drawn", "Sx_Path_Draw.wav"],
  ["button_click_fail", "Sx_UI_Button_ClickFAIL.wav"],
  ["button_click_ok", "Sx_UI_Button_ClickOK.wav"],
  ["button_hover", "Sx_UI_Button_Hover.wav"],
  ["button_hover", "Sx_UI_Button_Hover.wav"],
  ["ambient_sound_loop", "ambient_sound_loop.mp3"]
];

const nameToAudio = new Map(
  nameToFilePath.map(p => [p[0], new Audio(soundFolderRoot + p[1])])
);


// ======================================================================
// FUNCTIONS
// ======================================================================

// playSFX : String -> Void
// Plays the sound effect with the given name.
function playSFX(name,vol=1,loop=false) {

  // avoid error messages: ignore all audio until the browser will allow it
  // sound can only be played once the game has input focus
  if (firstClickEver) return;

  if (!gameMuted) {
    const audio = nameToAudio.get(name);
    if (audio) {
        audio.currentTime = 0;
        audio.volume = vol;
        audio.loop = loop;
        audio.play();
    } else {
      console.error("unknown sound: "+name);
    }
  }
}
