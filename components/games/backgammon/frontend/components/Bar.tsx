import { ReactNode } from "react";
import styles from "./Bar.module.css";

type Props = {
  fill: string;
  isTopRow: boolean;
  children: ReactNode;
  onClick: any;
};

export default function Bar(props: Props) {
  const { fill, isTopRow, children, onClick } = props;
  return (
    <div className={styles.barWrapper} style={{ fill }} onClick={onClick}>
      <div
        className={styles.bar}
        style={{ justifyContent: isTopRow ? "flex-end" : "initial" }}
      >
        {children}
      </div>
      <svg height="100%" width="100%" viewBox="0 0 32 100" preserveAspectRatio="none">
        <polygon
          points={isTopRow ? "16,0 0,100 32,100" : "0,0 16,100 32,0"}
          className={styles.polygon}
        />
      </svg>
    </div>
  );
}
