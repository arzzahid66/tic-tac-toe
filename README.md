# Tic Tac Toe

A complete, dependency-free Tic Tac Toe game for the browser. No build step, no
`npm install`, no framework — three files and it runs.

## How to run

**Easiest:** double-click `index.html`. It opens in your browser and works immediately.

**Or serve it locally** (needed if your browser is strict about local files):

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Features

- **Two modes** — local 2-player, or play against the computer
- **Three difficulties** — Easy, Medium, Impossible
- **Player names** — typed on the setup screen, shown in the scoreboard and turn indicator
- **Scoreboard** — wins per player plus draws, tracked across rounds in the session
- **Alternating starter** — the opening player flips each round, so nobody is stuck going second
- **Dark / light theme** — toggle in the top-right corner
- **Responsive** — the board stays square from desktop down to small phones
- **Keyboard playable** — Tab between cells, Enter to place a mark; screen readers get
  live turn announcements and per-cell position labels
- **Respects `prefers-reduced-motion`** — animations are disabled if the OS asks for it

## Files

| File | What's in it |
|---|---|
| `index.html` | Markup for the setup screen and the game screen |
| `style.css` | Theme tokens, board grid, mark drawing, animations, responsive rules |
| `script.js` | Game state, win detection, the AI, and all UI wiring |

## How the AI works

All three difficulties live in `getAIMove(board, mark, difficulty)` in `script.js`.

- **Easy** — picks a uniformly random empty cell. Genuinely beatable.
- **Medium** — takes a winning move if one exists, otherwise blocks your winning move,
  otherwise plays randomly. Feels like a casual human opponent.
- **Impossible** — full **minimax** search with alpha-beta pruning. It plays out every
  possible continuation of the game and picks the best one.

### The minimax scoring

The score folds in the search depth:

```js
result.winner === aiMark ? 10 - depth : depth - 10
```

That small detail matters. A plain win/loss score of `+10 / -10` makes the AI treat
"win in one move" and "win in five moves" as equally good, so it stalls. Subtracting the
depth means a **faster win scores higher**, and adding it means a **slower loss scores
higher** — so the AI finishes you off quickly, and when it is losing anyway it drags the
game out and gives you the maximum chance to blunder.

Among equally-scored best moves it picks randomly, so repeated games aren't identical.

This AI is **mathematically unbeatable** — verified exhaustively across every possible
human move sequence, from both seats (playing X and playing O) and both openings.
The best you can do is draw.

## Tweaking it

| What | Where |
|---|---|
| Colors, both themes | `:root` and `:root[data-theme="light"]` at the top of `style.css` |
| How long the AI "thinks" | `AI_DELAY_MS` at the top of `script.js` |
| Max name length | `MAX_NAME_LEN` in `script.js` |
| Board size | the `.board` rule (`width: min(88vw, 400px)`) in `style.css` |

## Code notes

- `render()` is the single source of truth — everything on screen is derived from the
  `state` object, so there's no scattered DOM patching to get out of sync.
- All nine cells share **one** delegated click listener on the board container.
- Player names are inserted with `textContent`, never `innerHTML`.
- Cells are real `<button>` elements, which is what makes keyboard support work for free.
