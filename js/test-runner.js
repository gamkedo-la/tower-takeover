
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






