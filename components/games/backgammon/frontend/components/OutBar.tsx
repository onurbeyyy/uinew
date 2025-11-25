import { ReactNode } from "react";
import styles from "./OutBar.module.css";

type Props = {
  fill: string;
  isLeft: boolean;
  children: ReactNode;
  onClick: any;
};

export default function OutBar(props: Props) {
  return (
    <div className={styles.barWrapper} style={{ fill: props.fill }} {...props}>
      <div
        className={styles.bar}
        style={{ justifyContent: props.isLeft ? "initial" : "flex-end" }}
      >
        {props.children}
      </div>
      <svg height="32" width="200">
        <polygon
          points={props.isLeft ? "0,0 0,32 200,16" : "0,16 200,0 200,32"}
          className={styles.polygon}
        />
      </svg>
    </div>
  );
}
