
// CurrentTestContext is a ([Action], Nat, Nat, [List-of Any])
// Each test is responsible for resetting all the values.
let currentTestContext = {
  func: null,
  testsRan: 0,
  testsFailed: 0,
  out: [],
}

window.onload = function() {
  const testOutputElement = document.getElementById("testOutput");

  const testFunctions = [
    testGeneratePathOrderedPoss,
    testConvertPxPosToLogicalPosInTileUnitsDisplay,
  ];
  
  runTests(testOutputElement, testFunctions);

  function runTests(testOutputElement, testFunctions) {
    for (const testFunction of testFunctions) {
      const testName = getFuncNameFromFunc(testFunction);

      currentTestContext.func = testFunction;
      currentTestContext.testsRan = 0;
      currentTestContext.testsFailed = 0;
      currentTestContext.out = ["<br><br>", testName, " ----- "];
      testOutputElement.innerHTML += currentTestContext.out.join("");
      currentTestContext.out = [];
      testFunction();

      if (currentTestContext.testsFailed <= 0) {
	testOutputElement.innerHTML += "OK!<br>";
      } else {
	testOutputElement.innerHTML += "FAILED!<br>";
      }

      testOutputElement.innerHTML += currentTestContext.out.join("");
    }
  }

  function testGeneratePathOrderedPoss() {
    // We test with one grid only, which suffices for our purposes. It has a
    // cycle inside.
    // We don't need more clones because we aren't considering units.
    const a = _.cloneDeep(WALL_PREFAB);
    const b = _.cloneDeep(WALKABLE_TILE_PREFAB);
    const grid0 = [
      [a, a, b, a],
      [b, b, b, b],
      [b, a, b, a],
      [b, b, b, a],
    ];

    _checkEqual(0, 2, 3, 2, [0, 2, 1, 2, 2, 2, 3, 2]);
    _checkEqual(3, 2, 0, 2, [3, 2, 2, 2, 1, 2, 0, 2]);
    _checkEqual(1, 1, 3, 2, [1, 1, 1, 2, 2, 2, 3, 2]);


    // natList is a flat list of integers, where every pair of integers is a
    // position. For example, [1, 5, 2, 6] corresopnds to [{r: 1, c: 5}, {r: 2,
    // c: 6}].
    function _checkEqual(r1, c1, r2, c2, natList) {
      checkEqual(_generatePathOrderedPoss(grid0, r1, c1, r2, c2),
		 _natListToPosList(natList));
    }

    // Maintains the order of positions.
    function _natListToPosList(natList) {
      // Every time it reaches a length of two, convert to a pos and empty the accumulator.
      let posAccumulator = [];
      let posList = [];

      for (const nat of natList) {
	posAccumulator.push(nat);

	if (posAccumulator.length === 2) {
	  const newPos = {r: posAccumulator[0], c: posAccumulator[1]};
	  posList.push(newPos);
	  posAccumulator = [];
	}
      }

      return posList;
    }
  }
  

  function testConvertPxPosToLogicalPosInTileUnitsDisplay() {
    const { l: ux, w: uy, dl: udx, dw: udy } = unitInTileUIInfo;
    
    _checkEqual(0, 0, 0, 0);
    _checkEqual(5, 5, 0, 0);
    _checkEqual(ux, uy, 0, 0);
    _checkEqual(ux + 1, uy, 0.5, 0);
    _checkEqual(ux, uy + 1, 0, 0.5);
    _checkEqual(ux + 1, uy + 1, 0.5, 0.5);
    _checkEqual(ux + udx, uy + udy, 1, 1);

    _checkEqual(ux + udx + 1, uy + udy + 1, 1, 1);
    _checkEqual(ux + udx + udx, uy + udy + uy, 1, 1);
    _checkEqual(ux + udx + ux + 2, uy + udy + uy + 2, 1.5, 1.5);

    _checkEqual(3 * (ux + udx) + ux - 3,
		6 * (uy + udy) + uy - 7,
	        3, 6);

    // A convenience helper check equal so that the user doesn't need to make
    // the pos object themselves.
    function _checkEqual(x1, y1, x2, y2) {
      const actual = {x: unitsInTileUIInfo.topLeftX + x1,
		      y: unitsInTileUIInfo.topLeftY + y1};
      const expected = {x: x2, y: y2};
      checkEqual(convertPxPosToLogicalPosInTileUnitsDisplay(actual), expected);
    }
  }

}

// x is actual, y is expected.
// Structural equality, with === for leaves.
function checkEqual(x, y) {
  const ok = Object.keys, tx = typeof x, ty = typeof y;
  const testPassed = deepEqual(x, y);

  if (!testPassed) {
    currentTestContext.out.push("Failed test #", currentTestContext.testsRan, "<br>");
    currentTestContext.out.push("<b>Actual: </b>", JSON.stringify(x), "<br>");
    currentTestContext.out.push("<b>Expected: </b>", JSON.stringify(y), "<br><br>");
    currentTestContext.testsFailed++;
  }

  currentTestContext.testsRan++;

}

// https://stackoverflow.com/questions/201183/how-can-i-determine-equality-for-two-javascript-objects
function deepEqual(x, y) {
  return (x && y && typeof x === 'object' && typeof y === 'object') ?
    (Object.keys(x).length === Object.keys(y).length) &&
      Object.keys(x).reduce(function(isEqual, key) {
        return isEqual && deepEqual(x[key], y[key]);
      }, true) : (x === y);
}


function getFuncNameFromFunc(func) {
  const rawFuncName = func.toString().substr('function '.length);
  
  return rawFuncName.substr(0, rawFuncName.indexOf('('));
}






