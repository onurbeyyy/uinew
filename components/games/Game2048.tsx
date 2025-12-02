'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { submitScore, getLeaderboard, type LeaderboardEntry } from '@/lib/gameApi';

// Tile interface
interface Tile {
  id: number;
  value: number;
  x: number;
  y: number;
  previousPosition?: { x: number; y: number };
  mergedFrom?: Tile[];
  isNew?: boolean;
  isMerged?: boolean;
}

// Grid class
class Grid {
  size: number;
  cells: (Tile | null)[][];

  constructor(size: number) {
    this.size = size;
    this.cells = [];
    for (let x = 0; x < size; x++) {
      this.cells[x] = [];
      for (let y = 0; y < size; y++) {
        this.cells[x][y] = null;
      }
    }
  }

  randomAvailableCell(): { x: number; y: number } | null {
    const cells = this.availableCells();
    if (cells.length) {
      return cells[Math.floor(Math.random() * cells.length)];
    }
    return null;
  }

  availableCells(): { x: number; y: number }[] {
    const cells: { x: number; y: number }[] = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (!this.cells[x][y]) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  cellsAvailable(): boolean {
    return this.availableCells().length > 0;
  }

  cellContent(position: { x: number; y: number }): Tile | null {
    if (this.withinBounds(position)) {
      return this.cells[position.x][position.y];
    }
    return null;
  }

  insertTile(tile: Tile): void {
    this.cells[tile.x][tile.y] = tile;
  }

  removeTile(tile: Tile): void {
    this.cells[tile.x][tile.y] = null;
  }

  withinBounds(position: { x: number; y: number }): boolean {
    return position.x >= 0 && position.x < this.size &&
           position.y >= 0 && position.y < this.size;
  }

  serialize(): { position: { x: number; y: number }; value: number }[] {
    const result: { position: { x: number; y: number }; value: number }[] = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const tile = this.cells[x][y];
        if (tile) {
          result.push({ position: { x, y }, value: tile.value });
        }
      }
    }
    return result;
  }
}

interface Game2048Props {
  onGameOver?: (score: number) => void;
  onGameWon?: (score: number) => void;
  playerNickname?: string;
  customerCode?: string;
}

export default function Game2048({ onGameOver, onGameWon, playerNickname: initialNickname, customerCode }: Game2048Props) {
  const [grid, setGrid] = useState<Grid>(new Grid(4));
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [scoreIncrement, setScoreIncrement] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const tileIdCounter = useRef(0);

  // Load best score and leaderboard
  useEffect(() => {
    const saved = localStorage.getItem('bestScore_2048');
    if (saved) {
      setBestScore(parseInt(saved));
    }

    const savedVisibility = localStorage.getItem('leaderboardVisibility_2048');
    if (savedVisibility !== null) {
      setShowLeaderboard(savedVisibility === 'true');
    }

    loadLeaderboard();
    restoreGameState();

    // Nickname kontrolü - Öncelik sırası:
    // 1. Giriş yapmış kullanıcının nickname'i (initialNickname prop)
    // 2. localStorage'daki nickname
    // 3. Modal göster

    if (initialNickname && initialNickname.trim()) {
      // Giriş yapmış kullanıcı → nickname'i otomatik kullan
      setNickname(initialNickname);
      localStorage.setItem('playerNickname_2048', initialNickname);
      setShowNicknameModal(false); // Modal kesinlikle kapalı
    } else {
      // LocalStorage'a bak (giriş yapmamış kullanıcılar için)
      const savedNickname = localStorage.getItem('playerNickname_2048');
      if (savedNickname && savedNickname.trim()) {
        setNickname(savedNickname);
        setShowNicknameModal(false);
      } else {
        // Nickname yok → Modal göster
        setShowNicknameModal(true);
      }
    }
  }, [initialNickname]);

  // Window resize listener for responsive tile positioning
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadLeaderboard = async () => {
    const data = await getLeaderboard('2048', 10);
    setLeaderboard(data);
  };

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('bestScore_2048', score.toString());
    }
  }, [score, bestScore]);

  useEffect(() => {
    if (tiles.length > 0 && !gameOver && !gameWon) {
      saveGameState();
    }
  }, [tiles, score, gameOver, gameWon]);

  const saveGameState = () => {
    const state = {
      grid: grid.serialize(),
      score,
      timestamp: Date.now()
    };
    localStorage.setItem('gameState_2048', JSON.stringify(state));
  };

  const restoreGameState = () => {
    const saved = localStorage.getItem('gameState_2048');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (Date.now() - state.timestamp < 3600000) {
          const newGrid = new Grid(4);
          state.grid.forEach((item: any) => {
            const tile: Tile = {
              id: tileIdCounter.current++,
              value: item.value,
              x: item.position.x,
              y: item.position.y
            };
            newGrid.insertTile(tile);
          });
          setGrid(newGrid);
          setScore(state.score);
          return;
        }
      } catch (e) {
        console.error('Failed to restore game state', e);
      }
    }
    initGame();
  };

  const initGame = useCallback(() => {
    const newGrid = new Grid(4);
    setGrid(newGrid);
    setTiles([]);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setShowMessage(false);
    setScoreSubmitted(false);
    setScoreIncrement(0);
    tileIdCounter.current = 0;

    localStorage.removeItem('gameState_2048');

    setTimeout(() => {
      addStartTiles(newGrid);
    }, 100);
  }, []);

  const addStartTiles = (currentGrid: Grid) => {
    addRandomTile(currentGrid);
    setTimeout(() => addRandomTile(currentGrid), 100);
  };

  const addRandomTile = (currentGrid: Grid) => {
    const cell = currentGrid.randomAvailableCell();
    if (cell) {
      const value = Math.random() < 0.9 ? 2 : 4;
      const tile: Tile = {
        id: tileIdCounter.current++,
        value,
        x: cell.x,
        y: cell.y,
        isNew: true
      };
      currentGrid.insertTile(tile);
      setTiles(prev => [...prev.filter(t => currentGrid.cellContent({ x: t.x, y: t.y })), tile]);
    }
  };

  const getVector = (direction: number): { x: number; y: number } => {
    const map: { [key: number]: { x: number; y: number } } = {
      0: { x: 0, y: -1 },  // Yukarı
      1: { x: 1, y: 0 },   // Sağa
      2: { x: 0, y: 1 },   // Aşağı
      3: { x: -1, y: 0 }   // Sola
    };
    return map[direction];
  };

  const buildTraversals = (vector: { x: number; y: number }): { x: number[]; y: number[] } => {
    const traversals = { x: [] as number[], y: [] as number[] };

    for (let pos = 0; pos < grid.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
  };

  const findFarthestPosition = (
    cell: { x: number; y: number },
    vector: { x: number; y: number },
    currentGrid: Grid
  ): { farthest: { x: number; y: number }; next: { x: number; y: number } } => {
    let previous: { x: number; y: number };
    let next = { x: cell.x, y: cell.y };

    do {
      previous = next;
      next = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (currentGrid.withinBounds(next) && !currentGrid.cellContent(next));

    return {
      farthest: previous,
      next: next
    };
  };

  const move = (direction: number) => {
    if (gameOver || gameWon) return;

    const vector = getVector(direction);
    const traversals = buildTraversals(vector);
    let moved = false;
    let addedScore = 0;

    // Prepare tiles: clear merged status
    grid.cells.forEach((row) => {
      row.forEach((tile) => {
        if (tile) {
          (tile as any).mergedFrom = null;
          tile.previousPosition = { x: tile.x, y: tile.y };
        }
      });
    });

    // Traverse in the right direction and move tiles
    traversals.x.forEach(x => {
      traversals.y.forEach(y => {
        const tile = grid.cellContent({ x, y });
        if (tile) {
          const positions = findFarthestPosition({ x, y }, vector, grid);
          const next = grid.cellContent(positions.next);

          // Only one merger per row traversal
          if (next && next.value === tile.value && !(next as any).mergedFrom) {
            const merged: Tile = {
              id: tileIdCounter.current++,
              value: tile.value * 2,
              x: positions.next.x,
              y: positions.next.y,
              mergedFrom: [tile, next],
              isMerged: true
            };

            grid.removeTile(tile);
            grid.removeTile(next);
            grid.insertTile(merged);

            // Update tile position for animation
            tile.x = positions.next.x;
            tile.y = positions.next.y;

            // Update the score
            addedScore += merged.value;

            // The mighty 2048 tile
            if (merged.value === 2048 && !gameWon) {
              const finalScore = score + addedScore;
              setTimeout(() => {
                setGameWon(true);
                setShowMessage(true);
                handleGameEnd(finalScore, true);
              }, 200);
            }

            moved = true;
          } else {
            // Move tile to farthest position
            if (positions.farthest.x !== x || positions.farthest.y !== y) {
              grid.removeTile(tile);
              tile.x = positions.farthest.x;
              tile.y = positions.farthest.y;
              grid.insertTile(tile);
              moved = true;
            }
          }
        }
      });
    });

    if (moved) {
      // Add a random tile
      addRandomTile(grid);

      // Collect all tiles from grid for rendering
      const allTiles: Tile[] = [];
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          const tile = grid.cells[x][y];
          if (tile) {
            allTiles.push(tile);
          }
        }
      }

      setTiles([...allTiles]);

      // Score'u güncelle
      const newScore = score + addedScore;
      if (addedScore > 0) {
        setScore(newScore);
        setScoreIncrement(addedScore);
        setTimeout(() => setScoreIncrement(0), 600);
      }

      // Clear animation flags after animations complete
      setTimeout(() => {
        grid.cells.forEach((row) => {
          row.forEach((tile) => {
            if (tile) {
              tile.isNew = false;
              tile.isMerged = false;
            }
          });
        });
      }, 400);

      // Check if game over
      if (!movesAvailable(grid)) {
        setTimeout(() => {
          setGameOver(true);
          setShowMessage(true);
          handleGameEnd(newScore, false);
        }, 200);
      }
    }
  };

  const movesAvailable = (currentGrid: Grid): boolean => {
    return currentGrid.cellsAvailable() || tileMatchesAvailable(currentGrid);
  };

  const tileMatchesAvailable = (currentGrid: Grid): boolean => {
    for (let x = 0; x < currentGrid.size; x++) {
      for (let y = 0; y < currentGrid.size; y++) {
        const tile = currentGrid.cellContent({ x, y });
        if (tile) {
          for (let direction = 0; direction < 4; direction++) {
            const vector = getVector(direction);
            const cell = { x: x + vector.x, y: y + vector.y };
            const other = currentGrid.cellContent(cell);
            if (other && other.value === tile.value) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: { [key: string]: number } = {
        'ArrowUp': 0,
        'w': 0,
        'W': 0,
        'ArrowRight': 1,
        'd': 1,
        'D': 1,
        'ArrowDown': 2,
        's': 2,
        'S': 2,
        'ArrowLeft': 3,
        'a': 3,
        'A': 3
      };

      if (keyMap[e.key] !== undefined) {
        e.preventDefault();
        move(keyMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, gameOver, gameWon, score]);

  const touchStart = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const dx = touchEnd.x - touchStart.current.x;
    const dy = touchEnd.y - touchStart.current.y;
    const minSwipeDistance = 30;

    if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) {
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 1 : 3);
    } else {
      move(dy > 0 ? 2 : 0);
    }
  };

  const getTilePosition = (x: number, y: number) => {
    let gap = 10;

    if (windowWidth <= 360) {
      gap = 6;
    } else if (windowWidth <= 480) {
      gap = 8;
    } else if (windowWidth <= 768) {
      gap = 10;
    }

    // Tile boyutunu CSS ile aynı şekilde hesapla
    // CSS: width: calc((100vw - XXpx) / 4)
    let boardWidth = windowWidth;
    let totalPadding = 0;

    if (windowWidth <= 360) {
      // Board: width: calc(100vw - 20px), padding: 10px
      boardWidth = windowWidth - 20;
      totalPadding = 20; // 10px * 2
      const innerWidth = boardWidth - totalPadding;
      const tileSize = (innerWidth - gap * 3) / 4;
      const step = tileSize + gap;
      return { transform: `translate(${x * step}px, ${y * step}px)` };
    } else if (windowWidth <= 480) {
      // Board: width: calc(100vw - 30px), padding: 12px
      boardWidth = windowWidth - 30;
      totalPadding = 24; // 12px * 2
      const innerWidth = boardWidth - totalPadding;
      const tileSize = (innerWidth - gap * 3) / 4;
      const step = tileSize + gap;
      return { transform: `translate(${x * step}px, ${y * step}px)` };
    } else if (windowWidth <= 768) {
      // Board: width: min(calc(100vw - 40px), 450px), padding: 15px
      boardWidth = Math.min(windowWidth - 40, 450);
      totalPadding = 30; // 15px * 2
      const innerWidth = boardWidth - totalPadding;
      const tileSize = (innerWidth - gap * 3) / 4;
      const step = tileSize + gap;
      return { transform: `translate(${x * step}px, ${y * step}px)` };
    }

    // Desktop: 480px board, 15px padding, 450px inner
    const tileSize = (450 - gap * 3) / 4; // (450 - 30) / 4 = 105px
    const step = tileSize + gap; // 105 + 10 = 115px

    return {
      transform: `translate(${x * step}px, ${y * step}px)`
    };
  };

  const handleGameEnd = async (finalScore: number, won: boolean) => {
    if (won) {
      onGameWon?.(finalScore);
    } else {
      onGameOver?.(finalScore);
    }

    // Giriş yapmış kullanıcı (initialNickname) varsa direkt skor kaydet
    const effectiveNickname = initialNickname?.trim() || nickname;

    if (!effectiveNickname && finalScore > 0) {
      // Nickname yoksa modal göster
      setShowNicknameModal(true);
    } else if (effectiveNickname && finalScore > 0 && !scoreSubmitted) {
      // Nickname varsa direkt skor kaydet
      if (!nickname && effectiveNickname) {
        setNickname(effectiveNickname);
      }
      await submitPlayerScore(finalScore);
    }
  };

  const submitPlayerScore = async (finalScore: number) => {
    if (!finalScore || scoreSubmitted) return;

    // Giriş yapmış kullanıcının nickname'ini kullan
    const effectiveNickname = initialNickname?.trim() || nickname;
    if (!effectiveNickname) return;

    const result = await submitScore({
      GameType: '2048',
      PlayerNickname: effectiveNickname,
      Score: finalScore,
      DeviceType: /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      VenueCode: customerCode || 'demo',
    });

    if (result.success) {
      setScoreSubmitted(true);
      await loadLeaderboard();
    }
  };

  const handleNicknameSubmit = async () => {
    if (!nickname.trim()) {
      alert('Lütfen bir takma ad girin!');
      return;
    }

    if (nickname.trim().length < 2) {
      alert('Takma ad en az 2 karakter olmalıdır!');
      return;
    }

    localStorage.setItem('playerNickname_2048', nickname.trim());
    setShowNicknameModal(false);

    // Oyunu başlat
    initGame();

    await submitPlayerScore(score);
  };

  const toggleLeaderboard = () => {
    const newValue = !showLeaderboard;
    setShowLeaderboard(newValue);
    localStorage.setItem('leaderboardVisibility_2048', newValue.toString());
  };

  return (
    <div className="game-2048-container">
      {/* Header */}
      <div className="game-2048-header">
        <h1 className="game-2048-title">2048</h1>
        <div className="game-2048-scores">
          <div className="game-2048-score-box">
            <div className="game-2048-score-label">Skor</div>
            <div className="game-2048-score-value">{score.toLocaleString('tr-TR')}</div>
            {scoreIncrement > 0 && (
              <div className="game-2048-score-increment">
                +{scoreIncrement.toLocaleString('tr-TR')}
              </div>
            )}
          </div>
          <div className="game-2048-score-box" style={{ background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.9), rgba(255, 152, 0, 0.9))' }}>
            <div className="game-2048-score-label">En İyi</div>
            <div className="game-2048-score-value">{bestScore.toLocaleString('tr-TR')}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="game-2048-controls">
        <p className="game-2048-instructions">
          Karoları birleştirerek <strong style={{ color: '#667eea' }}>2048</strong> sayısına ulaş!
        </p>
      </div>

      {/* Game Board */}
      <div
        className="game-2048-board"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid Background */}
        <div className="game-2048-grid-bg">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="game-2048-grid-cell" />
          ))}
        </div>

        {/* Tiles */}
        <div className="game-2048-tiles">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="game-2048-tile"
              style={getTilePosition(tile.x, tile.y)}
            >
              <div className={`game-2048-tile-inner tile-${tile.value} ${tile.isNew ? 'tile-new' : ''} ${tile.isMerged ? 'tile-merged' : ''}`}>
                {tile.value}
              </div>
            </div>
          ))}
        </div>

        {/* Game Over/Won Message */}
        {showMessage && (
          <div className="game-2048-message">
            <h2 className={`game-2048-message-title ${gameWon ? 'won' : 'lost'}`}>
              {gameWon ? 'Kazandın! 🎉' : 'Oyun Bitti!'}
            </h2>
            <p className="game-2048-message-score">
              Skorun: <strong style={{ color: '#ffd700', fontSize: '32px' }}>{score.toLocaleString('tr-TR')}</strong>
            </p>
            <button onClick={initGame} className="game-2048-message-btn">
              Tekrar Oyna
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard Toggle */}
      {leaderboard.length > 0 && (
        <div className="game-leaderboard-toggle">
          <button onClick={toggleLeaderboard} className="game-leaderboard-toggle-btn">
            {showLeaderboard ? '🏆 Sıralamayı Gizle' : '🏆 Sıralamayı Göster'}
          </button>
        </div>
      )}

      {/* Leaderboard */}
      {showLeaderboard && leaderboard.length > 0 && (
        <div className="game-leaderboard">
          <h3 className="game-leaderboard-title">🏆 En İyi Skorlar</h3>
          <div className="game-leaderboard-list">
            {leaderboard.slice(0, 5).map((entry) => (
              <div key={entry.rank} className="game-leaderboard-item">
                <div className="game-leaderboard-info">
                  <div className={`game-leaderboard-rank rank-${entry.rank <= 3 ? entry.rank : 'other'}`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </div>
                  <span className="game-leaderboard-name">{entry.playerNickname}</span>
                </div>
                <span className="game-leaderboard-score">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nickname Modal */}
      {showNicknameModal && (
        <div className="game-nickname-modal">
          <div className="game-nickname-modal-content">
            <h2 className="game-nickname-modal-title">🎮 Skorunu Kaydet</h2>
            <p className="game-nickname-modal-desc">
              Sıralama tablosuna girmek için bir takma ad girin:
            </p>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Takma adın"
              maxLength={20}
              className="game-nickname-input"
              onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
            />
            <div className="game-nickname-buttons">
              <button onClick={handleNicknameSubmit} className="game-nickname-btn primary">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
