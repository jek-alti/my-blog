(function () {
  "use strict";

  var SIZE = 4;
  var BEST_KEY = "2048-best";

  var board = [];        // SIZE x SIZE, 0 = empty
  var score = 0;
  var best = 0;
  var won = false;       // 2048 reached (win message already shown)
  var over = false;      // game over
  var busy = false;      // block input during overlay-only states

  var boardEl = document.getElementById("board");
  var gridBgEl = document.getElementById("grid-bg");
  var tilesEl = document.getElementById("tiles");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var overlayEl = document.getElementById("overlay");
  var overlayMsgEl = document.getElementById("overlay-msg");
  var overlayActionsEl = document.getElementById("overlay-actions");
  var newGameBtn = document.getElementById("new-game");

  // ---- setup helpers ----
  function emptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      b.push([0, 0, 0, 0]);
    }
    return b;
  }

  function loadBest() {
    var stored = 0;
    try {
      var raw = localStorage.getItem(BEST_KEY);
      if (raw !== null) {
        var n = parseInt(raw, 10);
        if (!isNaN(n) && n >= 0) stored = n;
      }
    } catch (e) { /* localStorage unavailable */ }
    best = stored;
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (e) { /* ignore */ }
  }

  function buildGridBg() {
    for (var i = 0; i < SIZE * SIZE; i++) {
      var c = document.createElement("div");
      c.className = "cell-bg";
      gridBgEl.appendChild(c);
    }
  }

  function emptyCells() {
    var cells = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) cells.push([r, c]);
      }
    }
    return cells;
  }

  function addRandomTile() {
    var cells = emptyCells();
    if (cells.length === 0) return;
    var pick = cells[Math.floor(Math.random() * cells.length)];
    board[pick[0]][pick[1]] = Math.random() < 0.9 ? 2 : 4;
  }

  // ---- rendering ----
  function render(mergedSet) {
    tilesEl.innerHTML = "";
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = board[r][c];
        if (v === 0) continue;
        var t = document.createElement("div");
        t.className = "tile";
        t.setAttribute("data-v", String(v));
        t.textContent = String(v);
        t.style.gridColumn = String(c + 1);
        t.style.gridRow = String(r + 1);
        if (mergedSet && mergedSet[r + "," + c]) {
          t.classList.add("merged");
        }
        tilesEl.appendChild(t);
      }
    }
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  // ---- move logic ----
  // Collapse a single row (array of values) toward the left (index 0).
  // Returns { row: newRow, gained: pointsGained, mergedIdx: [indices merged] }.
  function collapse(rowVals) {
    var filtered = rowVals.filter(function (v) { return v !== 0; });
    var result = [];
    var mergedIdx = [];
    var gained = 0;
    for (var i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        var mergedVal = filtered[i] * 2;
        result.push(mergedVal);
        mergedIdx.push(result.length - 1);
        gained += mergedVal;
        i++; // skip next, consumed by merge
      } else {
        result.push(filtered[i]);
      }
    }
    while (result.length < SIZE) result.push(0);
    return { row: result, gained: gained, mergedIdx: mergedIdx };
  }

  // Extract a line from the board in the traversal order for a direction,
  // where index 0 is the "destination" end (tiles slide toward it).
  // dir: "left","right","up","down"
  function getLine(dir, i) {
    var line = [];
    var k;
    if (dir === "left") {
      for (k = 0; k < SIZE; k++) line.push(board[i][k]);
    } else if (dir === "right") {
      for (k = SIZE - 1; k >= 0; k--) line.push(board[i][k]);
    } else if (dir === "up") {
      for (k = 0; k < SIZE; k++) line.push(board[k][i]);
    } else if (dir === "down") {
      for (k = SIZE - 1; k >= 0; k--) line.push(board[k][i]);
    }
    return line;
  }

  // Write a collapsed line back to the board, returning the (r,c) coords
  // for each line index so we can map merged indices to board positions.
  function setLine(dir, i, vals) {
    var coords = [];
    var k;
    if (dir === "left") {
      for (k = 0; k < SIZE; k++) { board[i][k] = vals[k]; coords.push([i, k]); }
    } else if (dir === "right") {
      for (k = 0; k < SIZE; k++) { board[i][SIZE - 1 - k] = vals[k]; coords.push([i, SIZE - 1 - k]); }
    } else if (dir === "up") {
      for (k = 0; k < SIZE; k++) { board[k][i] = vals[k]; coords.push([k, i]); }
    } else if (dir === "down") {
      for (k = 0; k < SIZE; k++) { board[SIZE - 1 - k][i] = vals[k]; coords.push([SIZE - 1 - k, i]); }
    }
    return coords;
  }

  function move(dir) {
    if (over || busy) return;

    var moved = false;
    var gainedTotal = 0;
    var mergedSet = {};
    var reached2048 = false;

    for (var i = 0; i < SIZE; i++) {
      var before = getLine(dir, i);
      var res = collapse(before.slice());
      var after = res.row;

      // detect change
      for (var j = 0; j < SIZE; j++) {
        if (before[j] !== after[j]) { moved = true; break; }
      }

      var coords = setLine(dir, i, after);
      gainedTotal += res.gained;

      for (var m = 0; m < res.mergedIdx.length; m++) {
        var idx = res.mergedIdx[m];
        var rc = coords[idx];
        mergedSet[rc[0] + "," + rc[1]] = true;
        if (after[idx] === 2048) reached2048 = true;
      }
    }

    if (!moved) return;

    score += gainedTotal;
    if (score > best) {
      best = score;
      saveBest();
    }

    addRandomTile();
    render(mergedSet);

    if (reached2048 && !won) {
      won = true;
      showOverlay("You Win!", true);
      return;
    }

    if (!canMove()) {
      over = true;
      showOverlay("Game Over", false);
    }
  }

  function canMove() {
    // any empty cell?
    if (emptyCells().length > 0) return true;
    // any adjacent equal pair?
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = board[r][c];
        if (c < SIZE - 1 && board[r][c + 1] === v) return true;
        if (r < SIZE - 1 && board[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  // ---- overlay ----
  function showOverlay(msg, isWin) {
    overlayMsgEl.textContent = msg;
    overlayActionsEl.innerHTML = "";

    if (isWin) {
      busy = true;
      var keep = document.createElement("button");
      keep.type = "button";
      keep.textContent = "Keep Going";
      keep.addEventListener("click", function () {
        hideOverlay();
        busy = false;
      });
      var restart = document.createElement("button");
      restart.type = "button";
      restart.className = "secondary";
      restart.textContent = "New Game";
      restart.addEventListener("click", function () {
        busy = false;
        newGame();
      });
      overlayActionsEl.appendChild(keep);
      overlayActionsEl.appendChild(restart);
    } else {
      var again = document.createElement("button");
      again.type = "button";
      again.textContent = "New Game";
      again.addEventListener("click", newGame);
      overlayActionsEl.appendChild(again);
    }

    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
  }

  // ---- new game ----
  function newGame() {
    board = emptyBoard();
    score = 0;
    won = false;
    over = false;
    busy = false;
    hideOverlay();
    addRandomTile();
    addRandomTile();
    render();
  }

  // ---- input: keyboard ----
  var KEY_DIR = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down"
  };

  document.addEventListener("keydown", function (e) {
    var dir = KEY_DIR[e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  });

  // ---- input: touch swipe ----
  var touchStartX = 0, touchStartY = 0, touching = false;
  var SWIPE_MIN = 24;

  boardEl.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    touching = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  boardEl.addEventListener("touchmove", function (e) {
    // prevent page scroll while interacting with the board
    if (touching) e.preventDefault();
  }, { passive: false });

  boardEl.addEventListener("touchend", function (e) {
    if (!touching) return;
    touching = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (absX < SWIPE_MIN && absY < SWIPE_MIN) return;
    if (absX > absY) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  }, { passive: true });

  // ---- wire up ----
  newGameBtn.addEventListener("click", newGame);

  // init
  loadBest();
  buildGridBg();
  newGame();
})();
