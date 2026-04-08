import styles from "./Skeleton.module.css";

interface Props {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
}

export function Skeleton({ width = "100%", height = "16px", radius = "6px", className }: Props) {
  return (
    <span
      className={`${styles.skeleton} ${className ?? ""}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}

export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "0.65rem 0.75rem" }}>
          <Skeleton height="14px" width={i === 0 ? "90px" : "60px"} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <Skeleton height="12px" width="70px" />
      <Skeleton height="28px" width="100px" radius="4px" />
    </div>
  );
}
