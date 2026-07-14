import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { GameProvider } from '@/store/GameContext';
import { loadMatch } from '@/store/matchService';
import { acquireLock, releaseLock, LOCK_HEARTBEAT_MS } from '@/store/matchLock';
import { useAuth } from '@/store/AuthContext';
import { useT } from '@/store/LangContext';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { AdminLogin } from '@/features/admin/AdminLogin';
import type { MatchRecord } from '@/data/types';
import { GameScreen } from './GameScreen';

export function GameRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useT();
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  /** True when another device is actively scoring this match. */
  const [lockedOut, setLockedOut] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!id) {
      setLoading(false);
      return;
    }
    loadMatch(id)
      .then((m) => alive && setMatch(m))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  // Resuming an already-started match is protected: taking control after a
  // break requires the organizer password (admin sign-in). A brand-new game
  // (no visits yet) is public, like normal scoring.
  const isResume =
    !!match && match.events.length > 0 && match.status === 'IN_PROGRESS';
  const needsPassword = isResume && !user;

  // Take control (heartbeat lock) once we're actually allowed to score.
  useEffect(() => {
    if (!id || !match || needsPassword) return;
    let alive = true;
    let beat: number | undefined;
    void acquireLock(id).then((r) => {
      if (!alive) return;
      if (!r.held) {
        setLockedOut(true);
        return;
      }
      setLockedOut(false);
      beat = window.setInterval(() => {
        void acquireLock(id).then((hb) => {
          if (alive && hb.byOther) {
            setLockedOut(true);
            if (beat) window.clearInterval(beat);
          }
        });
      }, LOCK_HEARTBEAT_MS);
    });
    return () => {
      alive = false;
      if (beat) window.clearInterval(beat);
      void releaseLock(id);
    };
  }, [id, match, needsPassword]);

  if (loading || authLoading) {
    return <Loading label={t('game.loadingMatch')} />;
  }
  if (!id || !match) return <Navigate to="/" replace />;

  if (needsPassword) {
    return (
      <div>
        <div className="mx-auto max-w-sm px-6 pt-6 text-center text-sm text-[var(--color-text-dim)]">
          {t('game.resumeProtected')}
        </div>
        <AdminLogin />
      </div>
    );
  }

  if (lockedOut) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-5xl">🔒</div>
        <div>
          <h1 className="text-xl font-black">{t('game.lockedTitle')}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-dim)]">
            {t('game.lockedText')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button variant="accent" size="xl" fullWidth onClick={() => navigate(`/live/${id}`)}>
            {t('home.live')}
          </Button>
          <Button variant="surface" size="lg" fullWidth onClick={() => navigate('/')}>
            {t('common.home').replace('← ', '')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GameProvider
      matchId={match.id}
      seasonId={match.seasonId}
      config={match.config}
      initialEvents={match.events}
      onEnd={() => navigate('/', { replace: true })}
    >
      <GameScreen />
    </GameProvider>
  );
}
