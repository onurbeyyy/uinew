import Game from "../logic/models/game";
import ThisMove from "../logic/models/this-move";

interface BoardProps {
  game: Game;
  thisMove: ThisMove;
  rollDice: any;
  startGame: any;
  select: any;
}

export default function BoardBottom(props: BoardProps) {
  // OutBar'lar artık ana ekranda gösteriliyor, burada sadece boş bir alt kısım
  return (
    <div className="board-bottom" style={{
      height: '20px',
      background: '#5d4e37'
    }}>
      {/* Alt kısım boş - OutBar'lar ana ekrana taşındı */}
    </div>
  );
}
