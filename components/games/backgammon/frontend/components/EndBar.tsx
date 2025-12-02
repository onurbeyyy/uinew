import { ReactNode } from "react";
import styles from "./EndBar.module.css";

type Props = {
  fill: string;
  children: ReactNode;
  onClick: any;
};

export default function EndBar(props: Props) {
  return (
    <div
      className={styles.barWrapper}
      style={{ backgroundColor: props.fill }}
      onClick={props.onClick}
    >
      <div className={styles.bar}>
        {props.children}
      </div>
    </div>
  );
}
