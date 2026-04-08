import { NavLink, useNavigate } from "react-router-dom";
import { authClient } from "../../api/auth";
import styles from "./Nav.module.css";

const NAV_LINKS = [
  { to: "/",          label: "Dashboard"  },
  { to: "/orders",    label: "Orders"     },
  { to: "/payments",  label: "Payments"   },
  { to: "/suppliers", label: "Suppliers"  },
];

export default function Nav() {
  const navigate = useNavigate();
  const session = authClient.useSession();

  async function handleSignOut(): Promise<void> {
    await authClient.signOut();
    void navigate("/auth");
  }

  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={styles.brand}>
        Track<span>Sheet</span>
      </NavLink>

      <ul className={styles.links}>
        {NAV_LINKS.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `${styles.link}${isActive ? ` ${styles.active}` : ""}`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className={styles.session}>
        <span className={styles.email}>{session.data?.user.email}</span>
        <button className={styles.signOut} onClick={() => { void handleSignOut(); }}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
