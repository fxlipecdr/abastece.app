/**
 * LoginPage — login com email/senha + Google OAuth (Seção 6).
 * Tratamento de erro explícito e loading states.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Litro } from '../../components/Litro';
import { supabase } from '../../services/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      navigate('/map', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/map` },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login com Google.');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Litro size={88} mood="happy" />
          <h1 className="mt-2 font-display text-2xl font-extrabold text-text-primary">
            Bem-vindo de volta
          </h1>
          <p className="text-text-secondary">O preço certo, na hora certa, perto de você.</p>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-text-secondary" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-surface-card p-3"
          />

          <label className="text-sm font-medium text-text-secondary" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-surface-card p-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-text-muted">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded-md border border-border bg-surface-card py-3 font-semibold text-text-primary"
        >
          Continuar com Google
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Ainda não tem conta?{' '}
          <Link to="/auth/register" className="font-semibold text-primary-light">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
