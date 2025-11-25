import { ReactNode } from "react";
import styles from "./Bar.module.css";

type Props = {
  fill: string;
  isTopRow: boolean;
  children: ReactNode;
  onClick: any;
};

export default function Bar(props: Props) {
  return (
    <div className={styles.barWrapper} style={{ fill: props.fill }} {...props}>
      <div
        className={styles.bar}
        style={{ justifyContent: props.isTopRow ? "flex-end" : "initial" }}
      >
        {props.children}
      </div>
      <svg height="200" width="32">
        <polygon
          points={props.isTopRow ? "16,0 0,200 32,200" : "0,0 16,200 32,0"}
          className={styles.polygon}
        />
      </svg>
    </div>
  );
}
