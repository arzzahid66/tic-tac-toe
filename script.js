/* ============================================================
   Tic Tac Toe — game logic
   Sections: constants -> state -> pure logic -> AI -> render -> events
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Constants ---------- */

  // The 8 ways to win, as board indices.
  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
    [0, 4, 8], [2, 4, 6]               // diagonals
  ];

  const AI_DELAY_MS = 380;
  const MAX_NAME_LEN = 14;

  /* ---------- State ---------- */

  const state = {
    board: Array(9).fill(null),   // null | "X" | "O"
    current: "X",                 // whose turn it is
    mode: "2p",                   // "2p" | "ai"
    difficulty: "medium",         // "easy" | "medium" | "hard"
    humanMark: "X",               // only meaningful in "ai" mode
    aiMark: "O",
    players: { X: "Player 1", O: "Player 2" },
    scores: { X: 0, O: 0, draw: 0 },
    starter: "X",                 // who opens the round; alternates each round
    gameOver: false,
    busy: false,                  // true while the AI is "thinking"
    winLine: null                 // the winning triple, for highlighting
  };

  let aiTimer = null;

  /* ---------- DOM refs ---------- */

  const el = {
    setupScreen: document.getElementById("setup-screen"),
    gameScreen: document.getElementById("game-screen"),
    setupForm: document.getElementById("setup-form"),
    difficultyField: document.getElementById("difficulty-field"),
    markHint: document.getElementById("mark-hint"),
    name1: document.getElementById("name-1"),
    name2: document.getElementById("name-2"),
    name1Label: document.getElementById("name-1-label"),
    name2Wrap: document.getElementById("name-2-wrap"),
    board: document.getElementById("board"),
    status: document.getElementById("status"),
    cardX: document.getElementById("card-X"),
    cardO: document.getElementById("card-O"),
    scoreNameX: document.getElementById("score-name-X"),
    scoreNameO: document.getElementById("score-name-O"),
    scoreX: document.getElementById("score-X"),
    scoreO: document.getElementById("score-O"),
    scoreDraw: document.getElementById("score-draw"),
    btnNext: document.getElementById("btn-next"),
    btnReset: document.getElementById("btn-reset"),
    btnSettings: document.getElementById("btn-settings"),
    themeToggle: document.getElementById("theme-toggle")
  };

  const cells = [];

  /* ---------- Pure game logic ---------- */

  // Returns { winner, line } or null. Handing back the line lets the UI
  // highlight exactly the three cells that won.
  function getWinner(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: line };
      }
    }
    return null;
  }

  function isFull(board) {
    return board.every(function (cell) { return cell !== null; });
  }

  function emptyCells(board) {
    const out = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) out.push(i);
    }
    return out;
  }

  function other(mark) {
    return mark === "X" ? "O" : "X";
  }

  /* ---------- AI ---------- */

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // The index that completes a line for `mark`, or -1 if there is none.
  function findLineCompletion(board, mark) {
    for (const line of WIN_LINES) {
      const marks = line.map(function (i) { return board[i]; });
      const owned = marks.filter(function (m) { return m === mark; }).length;
      const open = marks.filter(function (m) { return m === null; }).length;
      if (owned === 2 && open === 1) {
        return line[marks.indexOf(null)];
      }
    }
    return -1;
  }

  // Minimax with alpha-beta pruning.
  // Depth is folded into the score so the AI prefers a fast win and,
  // when it is losing anyway, the slowest possible loss.
  function minimax(board, mark, aiMark, depth, alpha, beta) {
    const result = getWinner(board);
    if (result) {
      return result.winner === aiMark ? 10 - depth : depth - 10;
    }
    if (isFull(board)) return 0;

    const maximizing = mark === aiMark;
    let best = maximizing ? -Infinity : Infinity;

    for (const i of emptyCells(board)) {
      board[i] = mark;
      const score = minimax(board, other(mark), aiMark, depth + 1, alpha, beta);
      board[i] = null;

      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, score);
      }
      if (beta <= alpha) break;   // this branch can't beat what we already have
    }
    return best;
  }

  function bestMove(board, aiMark) {
    let bestScore = -Infinity;
    let choices = [];

    for (const i of emptyCells(board)) {
      board[i] = aiMark;
      const score = minimax(board, other(aiMark), aiMark, 1, -Infinity, Infinity);
      board[i] = null;

      if (score > bestScore) {
        bestScore = score;
        choices = [i];
      } else if (score === bestScore) {
        choices.push(i);   // tie-break randomly so games aren't identical
      }
    }
    return randomChoice(choices);
  }

  function getAIMove(board, mark, difficulty) {
    const open = emptyCells(board);
    if (open.length === 0) return -1;

    if (difficulty === "easy") {
      return randomChoice(open);
    }

    if (difficulty === "medium") {
      const win = findLineCompletion(board, mark);
      if (win !== -1) return win;                     // take the win
      const block = findLineCompletion(board, other(mark));
      if (block !== -1) return block;                 // else deny theirs
      return randomChoice(open);
    }

    return bestMove(board.slice(), mark);             // "hard" — unbeatable
  }

  /* ---------- Rendering ---------- */

  function buildBoard() {
    el.board.textContent = "";
    cells.length = 0;

    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell is-empty";
      cell.dataset.index = String(i);
      cell.setAttribute("role", "gridcell");

      const ghost = document.createElement("span");
      ghost.className = "ghost";
      ghost.setAttribute("aria-hidden", "true");

      const mark = document.createElement("span");
      mark.className = "mark";
      mark.setAttribute("aria-hidden", "true");

      cell.append(ghost, mark);
      el.board.appendChild(cell);
      cells.push(cell);
    }
  }

  function cellLabel(index, value) {
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    const where = "Row " + row + ", column " + col;
    return value ? where + ", " + value : where + ", empty";
  }

  // Single source of truth: everything the player sees is derived from `state`.
  function render() {
    const isAITurn = state.mode === "ai" && state.current === state.aiMark;

    state.board.forEach(function (value, i) {
      const cell = cells[i];
      const isWinCell = !!state.winLine && state.winLine.indexOf(i) !== -1;

      cell.classList.toggle("is-x", value === "X");
      cell.classList.toggle("is-o", value === "O");
      cell.classList.toggle("is-filled", value !== null);
      cell.classList.toggle("is-empty", value === null);
      cell.classList.toggle("is-win", isWinCell);

      cell.disabled = value !== null || state.gameOver || isAITurn;
      cell.setAttribute("aria-label", cellLabel(i, value));
    });

    el.board.dataset.turn = state.current;
    el.board.classList.toggle("is-locked", state.busy);

    el.cardX.classList.toggle("is-active", !state.gameOver && state.current === "X");
    el.cardO.classList.toggle("is-active", !state.gameOver && state.current === "O");

    el.scoreX.textContent = String(state.scores.X);
    el.scoreO.textContent = String(state.scores.O);
    el.scoreDraw.textContent = String(state.scores.draw);

    // textContent, never innerHTML — names come from user input.
    el.scoreNameX.textContent = state.players.X;
    el.scoreNameO.textContent = state.players.O;
  }

  function setStatus(text, isResult) {
    el.status.textContent = text;
    el.status.classList.toggle("is-result", !!isResult);
  }

  function turnStatus() {
    if (state.mode === "ai" && state.current === state.aiMark) {
      setStatus(state.players[state.aiMark] + " is thinking...", false);
    } else {
      setStatus(state.players[state.current] + "'s turn (" + state.current + ")", false);
    }
  }

  /* ---------- Game flow ---------- */

  function startRound() {
    clearTimeout(aiTimer);
    state.board = Array(9).fill(null);
    state.current = state.starter;
    state.gameOver = false;
    state.busy = false;
    state.winLine = null;

    render();
    turnStatus();
    maybeAIMove();
  }

  function endRound(result) {
    state.gameOver = true;
    state.busy = false;

    if (result.winner) {
      state.winLine = result.line;
      state.scores[result.winner] += 1;
      setStatus(state.players[result.winner] + " wins!", true);
    } else {
      state.scores.draw += 1;
      setStatus("It's a draw.", true);
    }

    // Alternate who opens the next round so one side isn't always first.
    state.starter = other(state.starter);
    render();
  }

  function checkEnd() {
    const result = getWinner(state.board);
    if (result) { endRound(result); return true; }
    if (isFull(state.board)) { endRound({ winner: null }); return true; }
    return false;
  }

  function placeMark(index) {
    state.board[index] = state.current;

    // One-shot class so the mark animates in only when freshly placed.
    cells[index].classList.add("is-placed");
    setTimeout(function () {
      if (cells[index]) cells[index].classList.remove("is-placed");
    }, 320);

    if (checkEnd()) return;

    state.current = other(state.current);
    render();
    turnStatus();
    maybeAIMove();
  }

  // Guards: ignore clicks on filled cells, after the game ends,
  // and while the AI is mid-turn.
  function handleMove(index) {
    if (state.gameOver || state.busy) return;
    if (index < 0 || index > 8) return;
    if (state.board[index] !== null) return;
    if (state.mode === "ai" && state.current === state.aiMark) return;

    placeMark(index);
  }

  function maybeAIMove() {
    if (state.mode !== "ai" || state.gameOver) return;
    if (state.current !== state.aiMark) return;

    state.busy = true;
    render();

    clearTimeout(aiTimer);
    aiTimer = setTimeout(function () {
      const move = getAIMove(state.board, state.aiMark, state.difficulty);
      state.busy = false;
      if (move === -1 || state.gameOver) { render(); return; }
      placeMark(move);
    }, AI_DELAY_MS);
  }

  /* ---------- Setup screen ---------- */

  function cleanName(raw, fallback) {
    const trimmed = (raw || "").trim().slice(0, MAX_NAME_LEN);
    return trimmed.length ? trimmed : fallback;
  }

  function currentMode() {
    const checked = el.setupForm.querySelector('input[name="mode"]:checked');
    return checked ? checked.value : "2p";
  }

  // Keep the setup form's fields in sync with the selected mode.
  function syncSetupForm() {
    const isAI = currentMode() === "ai";

    el.difficultyField.hidden = !isAI;
    el.name2Wrap.hidden = isAI;
    el.name1Label.textContent = isAI ? "Your name" : "Player 1 name";
    el.name1.placeholder = isAI ? "You" : "Player 1";
    el.markHint.textContent = isAI
      ? "X moves first in round one; the starter alternates after that."
      : "X always moves first in round one.";
  }

  function showScreen(which) {
    el.setupScreen.classList.toggle("is-active", which === "setup");
    el.gameScreen.classList.toggle("is-active", which === "game");
  }

  function startGame(event) {
    event.preventDefault();

    const form = el.setupForm;
    const mode = currentMode();
    const mark = form.querySelector('input[name="mark"]:checked').value;
    const difficulty = form.querySelector('input[name="difficulty"]:checked').value;

    state.mode = mode;
    state.difficulty = difficulty;
    state.humanMark = mark;
    state.aiMark = other(mark);

    if (mode === "ai") {
      state.players[mark] = cleanName(el.name1.value, "You");
      state.players[other(mark)] = "Computer";
    } else {
      // In 2-player mode the two inputs map to X and O directly.
      state.players.X = cleanName(el.name1.value, "Player 1");
      state.players.O = cleanName(el.name2.value, "Player 2");
    }

    state.scores = { X: 0, O: 0, draw: 0 };
    state.starter = "X";

    showScreen("game");
    startRound();
  }

  /* ---------- Theme ---------- */

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const goingTo = theme === "dark" ? "light" : "dark";
    el.themeToggle.setAttribute("aria-label", "Switch to " + goingTo + " theme");
    el.themeToggle.querySelector(".theme-icon").textContent =
      theme === "dark" ? "☽" : "☀";
  }

  function toggleTheme() {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  }

  /* ---------- Wiring ---------- */

  buildBoard();

  // One delegated listener for all nine cells.
  el.board.addEventListener("click", function (event) {
    const cell = event.target.closest(".cell");
    if (!cell || !el.board.contains(cell)) return;
    handleMove(Number(cell.dataset.index));
  });

  el.setupForm.addEventListener("change", syncSetupForm);
  el.setupForm.addEventListener("submit", startGame);

  el.btnNext.addEventListener("click", startRound);

  el.btnReset.addEventListener("click", function () {
    state.scores = { X: 0, O: 0, draw: 0 };
    state.starter = "X";
    startRound();
  });

  el.btnSettings.addEventListener("click", function () {
    clearTimeout(aiTimer);
    state.busy = false;
    showScreen("setup");
  });

  el.themeToggle.addEventListener("click", toggleTheme);

  applyTheme("dark");
  syncSetupForm();
  render();
})();
