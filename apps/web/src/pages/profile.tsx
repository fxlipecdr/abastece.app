/**
 * ProfilePage — perfil do usuário logado (Seção 5.7).
 * Avatar, nível/XP, estatísticas, galeria de badges e favoritos.
 */
import { useNavigate } from 'react-router-dom';
import { LevelProgress } from '../components/LevelProgress';
import { BadgeGrid } from '../components/BadgeGrid';
import { Litro } from '../components/Litro';
import { useAuthStore } from '../stores/auth';
import { useBadges } from '../hooks/useBadges';
import { useFavorites } from '../hooks/useFavorites';

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const { data: badges = [] } = useBadges();
  const { data: favorites = [] } = useFavorites();

  if (!profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <Litro size={120} mood="happy" />
        <p className="text-text-secondary">Entre para ver seu perfil e suas conquistas.</p>
        <button
          onClick={() => navigate('/auth/login')}
          className="rounded-pill bg-primary px-6 py-3 font-semibold text-white"
        >
          Entrar
        </button>
      </div>
    );
  }

  const accuracy =
    profile.total_reports > 0
      ? Math.round((profile.accurate_reports / profile.total_reports) * 100)
      : 0;

  return (
    <div className="min-h-dvh bg-surface pb-10">
      <header className="bg-primary px-4 pb-6 pt-4 text-white">
        <button onClick={() => navigate('/map')} className="mb-3 text-sm text-white/80">
          ← Mapa
        </button>
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-pill object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-white/15">
              <Litro size={48} mood="cheer" />
            </div>
          )}
          <div>
            <h1 className="font-display text-xl font-extrabold">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-white/80">@{profile.username}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        <section className="-mt-4 rounded-md bg-surface-card p-4 shadow-card">
          <LevelProgress xp={profile.xp} />
        </section>

        {/* Estatísticas */}
        <section className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Reports" value={profile.total_reports} />
          <Stat label="Precisão" value={`${accuracy}%`} />
          <Stat label="Sequência" value={`${profile.streak_days}d`} />
        </section>

        {/* Favoritos */}
        <section className="mt-6">
          <h2 className="mb-2 font-display font-bold">Favoritos ({favorites.length})</h2>
          {favorites.length === 0 ? (
            <p className="text-sm text-text-muted">
              Você ainda não favoritou nenhum posto.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {favorites.map((f) => (
                <li key={f.station_id}>
                  <button
                    onClick={() => navigate(`/station/${f.station_id}`)}
                    className="w-full rounded-md border border-border bg-surface-card p-3 text-left font-semibold"
                  >
                    {f.stations?.name ?? 'Posto'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Badges */}
        <section className="mt-6">
          <h2 className="mb-3 font-display font-bold">Conquistas</h2>
          <BadgeGrid catalog={badges} earned={profile.badges} />
        </section>

        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="rounded-md border border-border py-3 font-semibold"
          >
            Configurações
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate('/map');
            }}
            className="rounded-md py-3 font-semibold text-danger"
          >
            Sair
          </button>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-surface-card p-3 text-center shadow-card">
      <p className="price-value text-xl font-bold text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

export default ProfilePage;
