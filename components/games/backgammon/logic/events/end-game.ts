

import Game from "../models/game";
import ThisTurn from "../models/this-turn";

export function readyToEnd(game: Game, thisTurn: ThisTurn): boolean {
  const containing: number[] = [];

  game.board.map((bar, barIdx) => {
    if (bar.includes(thisTurn.turnPlayer.name)) containing.push(barIdx);
  });

  if (thisTurn.turnPlayer.name === "White") {
    for (let i = 0; i < containing.length; i++) {
      const barIdx = containing[i];

      if (barIdx < 18) return false;
    }
  } else {
    for (let i = 0; i < containing.length; i++) {
      const barIdx = containing[i];

      if (barIdx < 6 || barIdx > 11) return false;
    }
  }

  return true;
}

export function celebrateGameEnd(thisTurn: ThisTurn): void {
  console.log(`${thisTurn.turnPlayer.icon} Oyunu Kazandı!`);
}
