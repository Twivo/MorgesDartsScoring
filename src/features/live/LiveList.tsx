import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildGameState } from '@/domain/engine';
import { participantDisplay } from '@/domain/presentation';
import { listLiveMatches } from '@/store/liveMatch';
import { useT } from '@/store/LangContext';
import type { MatchRecord } from '@/data/types';

/** Public list of matches currently in progress — tap one to watch it live. */
export function LiveList() {
  const navigate = useNavigate();
  const { t } = useT();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      listLiveMatches().then((m) => {
        if (alive) setMatches(m);
      });
    void refresh().finally(() => alive && setLoaded(true));
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => {
      alive = false;
      window.clearInterval(poll);
    };
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="rounded-lg px-2 py-1 text-sm text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]"
        >
          {t('common.home')}
        </button>
        <h1 className="text-xl font-black">{t('live.title')}</h1>
      </div>

      {!loaded ? (
        <p className="py-16 text-center text-[var(--color-text-dim)]">{t('common.loading')}</p>
      ) : matches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-[var(--color-text-dim)]">
          {t('live.none')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => {
            const state = buildGameState(m.config, m.events);
            const sides = m.config.participants
              .map((p) => participantDisplay(m.config, p.id))
              .join(`  ${t('common.vs')}  `);
            const legs = m.config.participants
              .map((p) => state.legsWon[p.id] ?? 0)
              .join(' – ');
            return (
              <li key={m.id}>
                <button
                  onClick={() => navigate(`/live/${m.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--color-accent)]"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{sides}</span>
                    <span className="text-xs text-[var(--color-text-dim)]">
                      {m.variant} {t(m.mode === 'DOUBLE' ? 'game.doubles' : 'game.singles')}
                      {m.encounterId ? ` · ${t('live.championship')}` : ''} · {t('game.legs')} {legs}
                    </span>
                  </span>
                  <span className="text-[var(--color-text-dim)]">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
