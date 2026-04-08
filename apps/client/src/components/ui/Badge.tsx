import type { OrderStatus } from "@tracksheet/shared";
import styles from "./Badge.module.css";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`${styles.badge} ${styles[status.toLowerCase() as Lowercase<OrderStatus>]}`}>
      {status}
    </span>
  );
}
