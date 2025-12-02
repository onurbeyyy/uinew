import { ReactNode } from "react";
import styles from "./Piece.module.css";

type Props = {
  color: string;
  border: string;
  children: ReactNode;
};

export default function Piece(props: Props) {
  const isWhite = props.color === "White";

  // 3D görünüm için gradient'ler - dış halka
  const whiteOuterGradient = "radial-gradient(circle at 30% 30%, #ffffff 0%, #e8e8e8 50%, #c0c0c0 100%)";
  const blackOuterGradient = "radial-gradient(circle at 30% 30%, #555555 0%, #333333 50%, #1a1a1a 100%)";

  return (
    <div
      className={styles.piece}
      style={{
        background: isWhite ? whiteOuterGradient : blackOuterGradient,
        border: props.border,
        color: isWhite ? "#333" : "#f0f0f0",
        boxShadow: isWhite
          ? "0 4px 8px rgba(0,0,0,0.35), inset 0 -3px 6px rgba(0,0,0,0.15)"
          : "0 4px 8px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(255,255,255,0.08)",
        textShadow: isWhite ? "none" : "0 1px 2px rgba(0,0,0,0.8)",
        position: "relative"
      }}
    >
      {/* Ortadaki çukur efekti */}
      <div
        className={styles.innerHole}
        style={{
          background: isWhite
            ? "radial-gradient(circle at 50% 40%, #d0d0d0 0%, #b8b8b8 40%, #a0a0a0 70%, #909090 100%)"
            : "radial-gradient(circle at 50% 40%, #2a2a2a 0%, #1f1f1f 40%, #151515 70%, #0a0a0a 100%)",
          boxShadow: isWhite
            ? "inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.5)"
            : "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(255,255,255,0.1)"
        }}
      />
      {/* Üst parlama efekti */}
      <div
        className={styles.highlight}
        style={{
          background: isWhite
            ? "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 60%)"
            : "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)"
        }}
      />
      {/* Taş sayısı (6'dan fazla varsa) */}
      <span className={styles.count}>{props.children}</span>
    </div>
  );
}
