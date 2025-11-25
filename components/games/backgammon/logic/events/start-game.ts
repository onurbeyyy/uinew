

import { dice } from "./roll-dice";
import Game from "../models/game";
import ThisTurn from "../models/this-turn";

export function backgammon() {
  console.log(
    `Tavla - Dünyanın en eski oyunu.
    İki oyuncu, iki taraf. Biri Beyaz, biri Siyah.`
  );
}

export function startingGame(game: Game): ThisTurn {
  var thisTurn: ThisTurn;

  while (true) {
    const [whiteFirst, whiteSecond] = dice();
    const [blackFirst, blackSecond] = dice();

    if (whiteFirst + whiteSecond > blackFirst + blackSecond) {
      thisTurn = new ThisTurn(game.whitePlayer, game.blackPlayer, [], false);
      console.log("Oyun ⚪ BEYAZ ⚪ ile başlıyor");

      break;
    } else if (whiteFirst + whiteSecond < blackFirst + blackSecond) {
      thisTurn = new ThisTurn(game.blackPlayer, game.whitePlayer, [], false);
      console.log("Oyun ⚫ SİYAH ⚫ ile başlıyor");

      break;
    }
  }

  return thisTurn;
}
