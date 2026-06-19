/**
 * RegisterPage — cadastro simples (email, senha, username) + Google (Seção 6).
 * O username é passado no metadata; o trigger handle_new_user cria o profile.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Litro } from '../../components/Litro';
import { supabase } from '../../services/supabase';

/** Valida username: 3-20 chars, letras/números/underscore. */
function isValidUsername(value: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(value);
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidUsername(username)) {
      setError('Username deve ter 3-20 caracteres (letras, números ou _).');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter ao menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (authError) throw authError;
      // Dependendo da config, pode exigir confirmação por email.
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <Litro size={120} mood="cheer" />
        <h1 className="font-display text-2xl font-extrabold">Conta criada! 🎉</h1>
        <p className="max-w-sm text-text-secondary">
          Se a confirmação por email estiver ativa, confira sua caixa de entrada. Depois é só
          entrar e começar a economizar.
        </p>
        <button
          onClick={() => navigate('/auth/login')}
          className="rounded-pill bg-primary px-6 py-3 font-semibold text-white"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Litro size={88} mood="happy" />
          <h1 className="mt-2 font-display text-2xl font-extrabold text-text-primary">
            Criar conta
          </h1>
          <p className="text-text-secondary">Junte-se à comunidade que economiza.</p>
        </div>

        {error && (
          <p className="mb-4 rounded-md tint-danger p-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-text-secondary" htmlFor="username">
            Nome de usuário
          </label>
          <input
            id="username"
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-border bg-surface-card p-3"
          />

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-surface-card p-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Criando…' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Já tem conta?{' '}
          <Link to="/auth/login" className="font-semibold text-primary-light">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
