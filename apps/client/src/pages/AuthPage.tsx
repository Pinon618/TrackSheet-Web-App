import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authClient } from "../api/auth";
import { useToast } from "../context/ToastContext";
import styles from "./AuthPage.module.css";

type AuthMode = "sign-in" | "sign-up";

export default function AuthPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const session = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session.data) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });

      if (result.error) {
        const message = result.error.message ?? "Authentication failed";
        setError(message);
        addToast(message, "error");
        return;
      }

      addToast(mode === "sign-in" ? "Signed in" : "Account created", "success");
      void navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={(e) => { void handleSubmit(e); }}>
        <h1 className={styles.heading}>
          {mode === "sign-in" ? "Sign in to TrackSheet" : "Create your TrackSheet account"}
        </h1>

        {error && <p className={styles.error}>{error}</p>}

        {mode === "sign-up" && (
          <label className={styles.field}>
            <span>Name</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>
        )}

        <label className={styles.field}>
          <span>Email</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </label>

        <button className={styles.submit} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>

        <button
          className={styles.switchMode}
          type="button"
          onClick={() => setMode((current) => current === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
