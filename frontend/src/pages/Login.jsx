import { useState } from "react";
import { Activity, LockKeyhole, Stethoscope } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { useAppContext } from "../context/useAppContext";

function Login() {
  const { isAuthenticated, login } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/" replace />;

  function handleSubmit(event) {
    event.preventDefault();
    if (!login(username, password)) {
      setError("Invalid username or password.");
      return;
    }
    navigate(location.state?.from || "/", { replace: true });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-app-bg)] px-4 py-8">
      <Card className="w-full max-w-md space-y-7 p-7 sm:p-9">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]">
            <Activity className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-primary)]">FemWell</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">Sign in to AI Screening Suite</h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Choose the workspace that matches your role.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--color-foreground)]">
            Username
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 focus-within:border-[var(--color-primary)]">
              <Stethoscope className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <input className="w-full bg-transparent px-1 py-3 outline-none" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
            </div>
          </label>
          <label className="block text-sm font-semibold text-[var(--color-foreground)]">
            Password
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 focus-within:border-[var(--color-primary)]">
              <LockKeyhole className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <input type="password" className="w-full bg-transparent px-1 py-3 outline-none" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </div>
          </label>
          {error && <p className="text-sm font-semibold text-[var(--color-danger)]" role="alert">{error}</p>}
          <Button type="submit" className="w-full justify-center">Sign in</Button>
        </form>

      </Card>
    </main>
  );
}

export default Login;
