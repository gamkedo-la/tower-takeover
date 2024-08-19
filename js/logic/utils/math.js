// Nat Nat -> Nat
// Returns a random integer within the given range of min to max, not including
// max.
function getRandomInt(min, max) {
  // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

// Num Num -> Num
// Returns a random number within the given range of min to max, not including max.
function getRandomNum(min, max) {
  return Math.random() * (max - min) + min;
}
