import { useEffect, useState } from "react";

const SCORE_KEY = "win11_games_highscores";

function readScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveHighScore(key, val) {
  const prev = readScores();
  if ((prev[key] || 0) < val) {
    const next = { ...prev, [key]: val };
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    return next;
  }
  return prev;
}

// === GAME 1: MINESWEEPER (8x8, 10 mines) ===
function buildMinesBoard() {
  const size = 64;
  const mines = new Set();
  while (mines.size < 10) mines.add(Math.floor(Math.random() * size));
  return Array.from({ length: size }, (_, idx) => {
    const r = Math.floor(idx / 8);
    const c = idx % 8;
    let adj = 0;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && mines.has(nr * 8 + nc)) adj += 1;
      }
    }
    return { mine: mines.has(idx), adj, open: false };
  });
}

function MinesweeperPanel({ onBestScore }) {
  const [board, setBoard] = useState(buildMinesBoard);
  const [status, setStatus] = useState("PLAYING"); // PLAYING | WON | LOST

  const reveal = (idx) => {
    if (status !== "PLAYING" || board[idx].open) return;
    if (board[idx].mine) {
      setBoard((prev) => prev.map((c) => (c.mine ? { ...c, open: true } : c)));
      setStatus("LOST");
      return;
    }
    const next = board.map((c, i) => (i === idx ? { ...c, open: true } : c));
    const safeOpened = next.filter((c) => !c.mine && c.open).length;
    setBoard(next);
    if (safeOpened >= 54) {
      setStatus("WON");
      onBestScore("minesWins", (readScores().minesWins || 0) + 1);
    }
  };

  const reset = () => {
    setBoard(buildMinesBoard());
    setStatus("PLAYING");
  };

  return (
    <>
      <div className="wapp-game-tabs">
        <span>
          {status === "WON" ? "🎉 Cleared!" : status === "LOST" ? "💥 Boom!" : "💣 Click safe tiles (10 mines)"}
        </span>
        <button type="button" onClick={reset} className="wapp-btn">🔄 New Game</button>
      </div>
      <div className="wapp-mines-grid">
        {board.map((cell, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => reveal(idx)}
            className={`wapp-mine-cell${cell.open ? (cell.mine ? " is-boom" : " is-open") : ""}`}
          >
            {cell.open ? (cell.mine ? "💣" : cell.adj || "") : ""}
          </button>
        ))}
      </div>
    </>
  );
}

// === GAME 2: CLASSIC SNAKE (14x14) ===
function randomFood(snake) {
  let pos = Math.floor(Math.random() * 196);
  while (snake.includes(pos)) pos = (pos + 17) % 196;
  return pos;
}

function SnakePanel({ onBestScore }) {
  const [snake, setSnake] = useState([90, 89, 88]);
  const [dir, setDir] = useState(1); // +1 right, -1 left, +14 down, -14 up
  const [food, setFood] = useState(45);
  const [running, setRunning] = useState(true);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowUp" && dir !== 14) setDir(-14);
      if (e.key === "ArrowDown" && dir !== -14) setDir(14);
      if (e.key === "ArrowLeft" && dir !== 1) setDir(-1);
      if (e.key === "ArrowRight" && dir !== -1) setDir(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dir]);

  useEffect(() => {
    if (!running || over) return undefined;
    const id = window.setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const col = head % 14;
        if ((dir === 1 && col === 13) || (dir === -1 && col === 0)) {
          setOver(true);
          return prev;
        }
        const nextHead = head + dir;
        if (nextHead < 0 || nextHead >= 196 || prev.includes(nextHead)) {
          setOver(true);
          return prev;
        }
        const ate = nextHead === food;
        const nextSnake = ate ? [nextHead, ...prev] : [nextHead, ...prev.slice(0, -1)];
        if (ate) {
          setFood(randomFood(nextSnake));
          onBestScore("snakeBest", nextSnake.length - 3);
        }
        return nextSnake;
      });
    }, 180);
    return () => window.clearInterval(id);
  }, [dir, food, running, over, onBestScore]);

  const restart = () => {
    setSnake([90, 89, 88]);
    setDir(1);
    setFood(45);
    setOver(false);
    setRunning(true);
  };

  return (
    <>
      <div className="wapp-game-tabs">
        <span>🐍 Score: {snake.length - 3} {over ? "— Game Over!" : ""}</span>
        <button type="button" onClick={() => setRunning((r) => !r)} className="wapp-btn">
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>
        <button type="button" onClick={restart} className="wapp-btn">🔄 Restart</button>
      </div>
      <div className="wapp-snake-grid">
        {Array.from({ length: 196 }, (_, idx) => (
          <div
            key={idx}
            className={`wapp-snake-cell${snake.includes(idx) ? " is-snake" : food === idx ? " is-food" : ""}`}
          />
        ))}
      </div>
      <div className="wapp-game-tabs">
        <button type="button" onClick={() => dir !== 14 && setDir(-14)} className="wapp-btn">⬆️</button>
        <button type="button" onClick={() => dir !== 1 && setDir(-1)} className="wapp-btn">⬅️</button>
        <button type="button" onClick={() => dir !== -14 && setDir(14)} className="wapp-btn">⬇️</button>
        <button type="button" onClick={() => dir !== -1 && setDir(1)} className="wapp-btn">➡️</button>
      </div>
    </>
  );
}

// === GAME 3: TIC-TAC-TOE ===
function calcWinner(sq) {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  for (const [a, b, c] of lines) {
    if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) return sq[a];
  }
  return sq.every(Boolean) ? "DRAW" : null;
}

function TicTacToePanel({ onBestScore }) {
  const [board, setBoard] = useState(Array(9).fill(""));
  const [turn, setTurn] = useState("X");
  const winner = calcWinner(board);

  const playCell = (idx) => {
    if (board[idx] || winner) return;
    const next = board.map((v, i) => (i === idx ? turn : v));
    setBoard(next);
    const w = calcWinner(next);
    if (w === "X" || w === "O") {
      onBestScore("tttWins", (readScores().tttWins || 0) + 1);
    } else {
      setTurn(turn === "X" ? "O" : "X");
    }
  };

  return (
    <>
      <div className="wapp-game-tabs">
        <span>
          {winner === "DRAW" ? "🤝 Draw!" : winner ? `🏆 Winner: ${winner}` : `Turn: ${turn}`}
        </span>
        <button type="button" onClick={() => { setBoard(Array(9).fill("")); setTurn("X"); }} className="wapp-btn">
          🔄 Reset
        </button>
      </div>
      <div className="wapp-ttt-grid">
        {board.map((val, idx) => (
          <button key={idx} type="button" onClick={() => playCell(idx)} className="wapp-ttt-cell">
            {val}
          </button>
        ))}
      </div>
    </>
  );
}

/**
 * [APP] GamesApp — Minesweeper, Classic Snake & Tic-Tac-Toe with High Score Tracking
 */
export default function GamesApp() {
  const [activeGame, setActiveGame] = useState("MINES");
  const [scores, setScores] = useState(readScores);

  const handleBestScore = (key, val) => {
    setScores(saveHighScore(key, val));
  };

  return (
    <div className="wapp-games-wrap">
      <div className="wapp-game-tabs">
        <button type="button" onClick={() => setActiveGame("MINES")} className={`wapp-btn${activeGame === "MINES" ? " is-active" : ""}`}>
          💣 Minesweeper (Wins: {scores.minesWins || 0})
        </button>
        <button type="button" onClick={() => setActiveGame("SNAKE")} className={`wapp-btn${activeGame === "SNAKE" ? " is-active" : ""}`}>
          🐍 Snake (Best: {scores.snakeBest || 0})
        </button>
        <button type="button" onClick={() => setActiveGame("TTT")} className={`wapp-btn${activeGame === "TTT" ? " is-active" : ""}`}>
          ⭕ Tic-Tac-Toe (Wins: {scores.tttWins || 0})
        </button>
      </div>

      {activeGame === "MINES" && <MinesweeperPanel onBestScore={handleBestScore} />}
      {activeGame === "SNAKE" && <SnakePanel onBestScore={handleBestScore} />}
      {activeGame === "TTT" && <TicTacToePanel onBestScore={handleBestScore} />}
    </div>
  );
}
