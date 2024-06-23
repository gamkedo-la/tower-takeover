// ================================================================================
// MODULE INTERFACE
// ================================================================================
// Responsible for providing path-finding algorithm. A* is used.

// generatePathOrderedPoss
// [2D-array-of Tile], Nat, Nat, Nat, Nat -> [Array-of Pos]
// Generates an ordered array of positions that goes from (and includes)
// position (r1, c1) to position (r2, c2) in the given grid. The first and last
// element of the positions can be anything but walls, and the positions in
// between must correspond to walkable tiles.

// ================================================================================
// MAIN FUNCTIONALITY
// ================================================================================

function generatePathOrderedPoss(grid, r1, c1, r2, c2) {
  // A* search algorithm.
  
  // openList, represents the frontier, nodes we have identified but have not
  // yet expanded, initialized as the node with position (r1, c1). For each step
  // in the algorithm, we take the node with the lowest f (cost from initial
  // node to that node, plus the cost from that node to the goal node using the
  // manhattan distance heuristic). We then expand that node (we call it q),
  // adding its successors to the openList. If we have already expanded the
  // successor (which we keep track of with the closedList), then we can just
  // ignore that successor. If the successor is already in the openList, we
  // should lower its f value if the new f value is lower (I explained that bad,
  // sorry). If the successor has never been seen before, we can just add to the
  // openList.

  // This algorithm terminates when the goal node is found, in which case the
  // path is returned, or when there are no more nodes in the frontier and the
  // goal node is not found, in which case log and error. (This function
  // operates with the assumption then the goal node is reachable.)

  // This functions adds extra information on a node on top of (r, c). It adds
  // the f value, the g value (cost to get there, this depends on the parent, so
  // we might as well save this value), and the parent node.

  // The reason why we need the parent node is so that by the time we have
  // reached the goal node, we have a chain of parents leading to the initial
  // node. In other words, the parent node allows us to recover the path from
  // all the searching.

  // All the extra information can be forgotten when we return the path of nodes.

  // An ASNode is a (Nat, Nat, Nat, Nat, [U ASNode False])
  // Represents (row position, column position, g value, f value, parent node if
  // it exists).

  // Implementation from:
  // https://www.geeksforgeeks.org/a-search-algorithm/
  // However, the goal check is moved to when the node is expanded instead of
  // when looking through the successors. It hardly matters, but this is just in
  // case there is actually a better path to the goal. Also, the moment a node
  // is expanded, it is added to the closedList. 
  
  // [Array-of ASNode]
  let openList = [{r: r1, c: c1, g: 0, f: _getH(r2, c2, r1, c1), parent: false}];
  let closedList = [];

  while (openList.length > 0) {
    const qIndex = _getIndexWithSmallestF(openList);
    const q = openList[qIndex];

    // We found the goal node.
    if (q.r === r2 && q.c === c2) {
      // Unwind the parent nodes until we reach the initial position.
      let reversedRv = [];
      let currNode = q;
      while (currNode !== false) {
	reversedRv.push({ r: currNode.r, c: currNode.c});
	currNode = currNode.parent;
      }

      return reversedRv.reverse();
    }
      
    openList.splice(qIndex, 1);  // Remove q from openList.
    closedList.push(q);

    const validSuccessors = _getSuccessors(grid, q, r2, c2);

    for (const successor of validSuccessors) {
      successor.g = q.g + 1;
      successor.h = _getH(r2, c2, successor.r, successor.c);
      successor.f = successor.g + successor.h;
      successor.parent = q;

      const samePosFInOpenListIndex = _getSamePosNodeIndex(openList, successor);
      const samePosFInClosedListIndex = _getSamePosNodeIndex(closedList, successor);

      if (samePosFInClosedListIndex && closedList[samePosFInClosedListIndex].f < successor.f) {
	// If there is an easier way to get to the successor, then we shouldn't
	// add the successor to the openList and we the successor's parent
	// should remain the same.
      } else if (samePosFInClosedListIndex && closedList[samePosFInClosedListIndex].f >= successor.f) {
	// This case should be impossible given a rectangular grid. If it
	// is... well... I probably should have used a different source.  -Marvin
	console.error("Impossible case in A* search");
	
      } else if (samePosFInOpenListIndex && openList[samePosFInOpenListIndex].f < successor.f) {
	// If the openList already contains the successor with a better way of
	// getting to it, then we shouldn't change that.
      } else if (samePosFInOpenListIndex && openList[samePosFInOpenListIndex].f >= successor.f) {
	// If there is a better way of getting to a node in the frontier, then
	// we should update that node.
	openList[samePosFInOpenListIndex] = successor;
      } else {
	// Not in either lists
	openList.push(successor);
      }
    }
  }

  console.error(`A Star search algorithm unable to find a path from (${r1}, ${c1}) to (${r2}, ${c2})`);
}

// ================================================================================
// AUXILLARY FUNCTIONS
// ================================================================================

function _getH(ra, ca, rb, cb) {
  // Manhattan distance strategy.
  return Math.abs(ra - rb) + Math.abs(ca - cb);
}

// [Array-of {r, c, f, g}] -> Nat
// Returns the index in the open list with the smallest f value. Assume that
// the given list has at least one item.
function _getIndexWithSmallestF(openList0) {
  let currSmallestF = Infinity;
  let currIndexWithSmallestF;

  for (let i = 0; i < openList0.length; i++) {
    const rcfg = openList0[i];
    
    if (rcfg.f < currSmallestF) {
      currSmallestF = rcfg.f;
      currIndexWithSmallestF = i;
    }
  }

  return currIndexWithSmallestF;
}

// [2D-array-of Tile] {r, c, f, g} Nat Nat -> [Array-of {r, c}]
// Gets the successors of the given position (with f) q0 in the given grid,
// where row r and column c is the position of the destination tile.
function _getSuccessors(grid0, q0, r, c) {
  // A valid successor is one that is one manhattan distance unit away from
  // the position of q0, and is within the bounds of the grid, and is either a
  // walkable tile or the destination tile (the destination tile is assumed to
  // be legal).
  const totalNeighbours = [
    {r: q0.r - 1, c: q0.c},
    {r: q0.r + 1, c: q0.c},
    {r: q0.r, c: q0.c - 1},
    {r: q0.r, c: q0.c + 1},
  ];

  const validSuccessors = totalNeighbours.filter((pos) => {
    return (pos.r >= 0 && pos.r < grid0.length &&
	    pos.c >= 0 && pos.c < grid0[pos.r].length &&
	    grid0[pos.r][pos.c].tag === TILE_TYPE.WALKABLE_TILE) ||
      (pos.r === r && pos.c === c);
  });

  return validSuccessors;
}

// [Array-of {r, c, f, g}] {r, c, f, g} -> [U Nat #f]
// Gets the f value of the position that is the same position as the given
// successor if it exists, otherwise returns false.
function _getSamePosNodeIndex(lst, successor0) {
  for (let i = 0; i < lst.length; i++) {
    const asnode = lst[i];
    if (asnode.r === successor0.r && asnode.c === successor0.c) {
      return i;
    }
  }

  return false;
}
