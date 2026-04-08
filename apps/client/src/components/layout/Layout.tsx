import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "../../api/auth";
import Nav from "./Nav";
import styles from "./Layout.module.css";

export default function Layout() {
  const session = authClient.useSession();

  if (session.isPending) {
    return <main className={styles.main}>Loading...</main>;
  }

  if (!session.data) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className={styles.root}>
      <Nav />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
