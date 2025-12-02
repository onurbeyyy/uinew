import { ReactNode } from "react";
import styles from "./OutBar.module.css";

type Props = {
  fill: string;
  isLeft: boolean;
  children: ReactNode;
  onClick: any;
};

export default function OutBar(props: Props) {
  const { fill, isLeft, children, onClick } = props;
  return (
    <div className={styles.barWrapper} style={{ fill }} onClick={onClick}>
      <div
        className={styles.bar}
        style={{ justifyContent: isLeft ? "initial" : "flex-end" }}
      >
        {children}
      </div>
      <svg height="32" width="200">
        <polygon
          points={isLeft ? "0,0 0,32 200,16" : "0,16 200,0 200,32"}
          className={styles.polygon}
        />
      </svg>
    </div>
  );
}
