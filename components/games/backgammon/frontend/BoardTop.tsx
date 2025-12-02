import Game from "../logic/models/game";
import ThisMove from "../logic/models/this-move";
import Bar from "./components/Bar";
import Board from "./components/Board";
import Piece from "./components/Piece";

interface BoardProps {
  game: Game;
  thisMove: ThisMove;
  select: any;
  perspective?: 'White' | 'Black';  // Hangi oyuncunun bakış açısı
}

export default function BoardTop(props: BoardProps) {
  // Beyaz oyuncu döndürülmüş tahta görür, siyah standart görür
  const isBlackPerspective = props.perspective !== 'Black';

  return (
    <div className="board-top">
      <CreateBoard />
    </div>
  );

  function CreateBoard() {
    // Tavla kuralları:
    // Beyaz evi: 1-6 (index 0-5), hareket yönü: 24 → 1
    // Siyah evi: 19-24 (index 18-23), hareket yönü: 1 → 24

    // Beyaz perspektifi (varsayılan):
    // Üst satır: 13-18 | BAR | 19-24 (siyah evi üst sağda)
    // Alt satır: 12-7  | BAR | 6-1   (beyaz evi alt sağda) ✓

    // Siyah perspektifi (180° döndürülmüş):
    // Üst satır: 12-7  | BAR | 6-1   (beyaz evi üst sağda)
    // Alt satır: 13-18 | BAR | 19-24 (siyah evi alt sağda) ✓

    let topLeftData: string[][];
    let topRightData: string[][];
    let bottomLeftData: string[][];
    let bottomRightData: string[][];
    let topLeftIndices: number[];
    let topRightIndices: number[];
    let bottomLeftIndices: number[];
    let bottomRightIndices: number[];

    if (isBlackPerspective) {
      // Siyah oyuncunun bakış açısı - tahta 180° döndürülmüş
      // Siyahın evi (19-24) sağ altta görünmeli
      topLeftData = props.game.board.slice(6, 12).slice().reverse();   // pozisyon 12-7
      topRightData = props.game.board.slice(0, 6).slice().reverse();   // pozisyon 6-1 (beyaz evi)
      bottomLeftData = props.game.board.slice(12, 18);                  // pozisyon 13-18
      bottomRightData = props.game.board.slice(18, 24);                 // pozisyon 19-24 (siyah evi)

      topLeftIndices = [11, 10, 9, 8, 7, 6];               // index 11-6
      topRightIndices = [5, 4, 3, 2, 1, 0];                // index 5-0
      bottomLeftIndices = [12, 13, 14, 15, 16, 17];        // index 12-17
      bottomRightIndices = [18, 19, 20, 21, 22, 23];       // index 18-23
    } else {
      // Beyaz oyuncunun bakış açısı (varsayılan)
      // Beyazın evi (1-6) sağ altta görünmeli
      topLeftData = props.game.board.slice(12, 18);        // pozisyon 13-18
      topRightData = props.game.board.slice(18, 24);       // pozisyon 19-24 (siyah evi)
      bottomLeftData = props.game.board.slice(6, 12).slice().reverse();   // pozisyon 12-7
      bottomRightData = props.game.board.slice(0, 6).slice().reverse();   // pozisyon 6-1 (beyaz evi)

      topLeftIndices = [12, 13, 14, 15, 16, 17];           // index 12-17
      topRightIndices = [18, 19, 20, 21, 22, 23];          // index 18-23
      bottomLeftIndices = [11, 10, 9, 8, 7, 6];            // index 11-6
      bottomRightIndices = [5, 4, 3, 2, 1, 0];             // index 5-0
    }

    return (
      <Board>
        {/* ÜST SATIR - üçgenler aşağı bakıyor (isTop=false) */}
        {topLeftData.map((bar: string[], idx: number) => (
          <CreateBar
            bar={bar}
            barIdx={topLeftIndices[idx]}
            key={`top-left-${topLeftIndices[idx]}`}
            isTop={false}
            {...props}
          />
        ))}
        <div key="middle-bar" style={{
          background: 'linear-gradient(90deg, #3d2914 0%, #5a3d1f 50%, #3d2914 100%)',
          gridColumn: '7',
          gridRow: '1 / 3',
          borderRadius: '4px',
          minWidth: '18px',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.3), inset -2px 0 4px rgba(0,0,0,0.3)'
        }} />
        {topRightData.map((bar: string[], idx: number) => (
          <CreateBar
            bar={bar}
            barIdx={topRightIndices[idx]}
            key={`top-right-${topRightIndices[idx]}`}
            isTop={false}
            {...props}
          />
        ))}

        {/* ALT SATIR - üçgenler yukarı bakıyor (isTop=true) */}
        {bottomLeftData.map((bar: string[], idx: number) => (
          <CreateBar
            bar={bar}
            barIdx={bottomLeftIndices[idx]}
            key={`bottom-left-${bottomLeftIndices[idx]}`}
            isTop={true}
            {...props}
          />
        ))}
        {bottomRightData.map((bar: string[], idx: number) => (
          <CreateBar
            bar={bar}
            barIdx={bottomRightIndices[idx]}
            key={`bottom-right-${bottomRightIndices[idx]}`}
            isTop={true}
            {...props}
          />
        ))}
      </Board>
    );
  }

  interface BarProps extends BoardProps {
    bar: string[];
    barIdx: number;
    isTop?: boolean;
  }

  function CreateBar(props: BarProps) {
    const isTopRow = props.isTop !== undefined ? props.isTop : props.barIdx > 11;

    return (
      <div style={{ position: 'relative' }}>
        <Bar
          isTopRow={isTopRow}
          onClick={() => props.select(props.barIdx)}
          key={props.barIdx}
          fill={
            (props.thisMove.canGoTo.includes(props.barIdx) && "#FFD700") ||
            (props.barIdx % 2 === 0 && "#8B2323") ||
            "#2F1810"
          }
        >
          {props.bar.map(
            (piece: string, pieceIdx: number) =>
              pieceIdx < 6 && (
                <CreatePiece
                  piece={piece}
                  pieceIdx={pieceIdx}
                  key={`${props.barIdx}-${pieceIdx}-temp`}
                  border={
                    (props.thisMove.fromBarIdx === props.barIdx &&
                      ((pieceIdx === 0 && !isTopRow) ||
                        (pieceIdx === props.bar.length - 1 && isTopRow)) &&
                      "2px solid #FFD700") ||
                    (piece == "White"
                      ? props.game.whitePlayer.pieceBorderColor
                      : props.game.blackPlayer.pieceBorderColor)
                  }
                  {...props}
                />
              )
          )}
        </Bar>
      </div>
    );
  }

  interface PieceProps {
    bar: string[];
    barIdx: number | string;
    piece: string;
    pieceIdx: number;
    border: string;
    isTop?: boolean;
  }

  function CreatePiece(props: PieceProps) {
    const isTopRow = props.isTop !== undefined ? props.isTop : false;
    return (
      <Piece
        key={`${props.barIdx}-${props.pieceIdx}`}
        border={props.border}
        color={props.piece}
      >
        {props.bar.length > 6 &&
          ((props.pieceIdx === 0 && !isTopRow) ||
            (props.pieceIdx === 5 && isTopRow)) && (
            <>{props.bar.length - 6}</>
          )}
      </Piece>
    );
  }
}
