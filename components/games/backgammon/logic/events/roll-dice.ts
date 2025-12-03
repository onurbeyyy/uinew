

import ThisTurn from "../models/this-turn";

export function dice(): number[] {
  const first = Math.floor(Math.random() * 6) + 1;
  const second = Math.floor(Math.random() * 6) + 1;

  return [first, second];
}

export function rollingDice(tempTurn: ThisTurn) {
  const thisTurn = new ThisTurn(
    tempTurn.turnPlayer,
    tempTurn.opponentPlayer,
    dice(),
    true
  );

  if (thisTurn.dices[0] === thisTurn.dices[1]) {
      `${thisTurn.turnPlayer.icon} 🎲 Çift attı ${thisTurn.dices} 🎲`
    );
  } else {
      `${thisTurn.turnPlayer.icon} 🎲 Zar attı ${thisTurn.dices} 🎲`
    );
  }

  return thisTurn;
}
