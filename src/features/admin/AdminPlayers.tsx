import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { cn } from '@/lib/cn';
import { useRoster } from '@/store/RosterContext';
import { useT } from '@/store/LangContext';

type SortKey = 'name' | 'createdAt';

export function AdminPlayers() {
  const confirm = useConfirm();
  const { t } = useT();
  const {
    players,
    loading,
    error,
    addPlayer,
    updatePlayer,
    setActive,
    removePlayer,
  } = useRoster();

  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('admin.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    const dir = sortDir === 'asc' ? 1 : -1;
    return players
      .filter((p) => !s || p.name.toLowerCase().includes(s))
      .sort((a, b) =>
        sortKey === 'name'
          ? a.name.localeCompare(b.name) * dir
          : ((a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1) * dir,
      );
  }, [players, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const submitAdd = () => {
    if (!name.trim()) return;
    void run(async () => {
      await addPlayer(name);
      setName('');
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
          placeholder={t('admin.newPlayerName')}
          className="min-w-40 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 outline-none focus:border-[var(--color-accent)]"
        />
        <Button variant="accent" size="md" onClick={submitAdd} disabled={busy}>
          {t('admin.addPlayer')}
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="min-w-40 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <div className="flex gap-1 text-xs">
          <SortChip active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')}>
            {t('admin.name')}
          </SortChip>
          <SortChip
            active={sortKey === 'createdAt'}
            dir={sortDir}
            onClick={() => toggleSort('createdAt')}
          >
            {t('admin.added')}
          </SortChip>
        </div>
      </div>

      {(error || actionError) && (
        <p className="mb-3 rounded-lg bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]">
          {error ?? actionError}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-[var(--color-text-dim)]">{t('common.loading')}</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-[var(--color-text-dim)]">
          {players.length === 0 ? t('admin.noPlayers') : t('admin.noMatch')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => (
            <li
              key={p.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                p.active
                  ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-50',
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: p.color ?? '#666' }}
              />
              {editingId === p.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void run(async () => {
                        if (editName.trim())
                          await updatePlayer(p.id, { name: editName.trim() });
                        setEditingId(null);
                      });
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => setEditingId(null)}
                  className="flex-1 rounded-lg bg-[var(--color-surface-2)] px-2 py-1 outline-none"
                />
              ) : (
                <button
                  className="flex-1 text-left text-lg"
                  onClick={() => {
                    setEditingId(p.id);
                    setEditName(p.name);
                  }}
                >
                  {p.name}
                  {!p.active && (
                    <span className="ml-2 text-xs text-[var(--color-text-mute)]">
                      ({t('admin.inactive')})
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => void run(() => setActive(p.id, !p.active))}
                disabled={busy}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold',
                  p.active
                    ? 'text-[var(--color-warning)] hover:bg-[var(--color-surface-2)]'
                    : 'text-[var(--color-success)] hover:bg-[var(--color-surface-2)]',
                )}
              >
                {p.active ? t('admin.deactivate') : t('admin.activate')}
              </button>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: t('admin.deletePlayerTitle').replace('{name}', p.name),
                    message: t('admin.deletePlayerMessage'),
                    danger: true,
                    confirmLabel: t('common.delete'),
                  });
                  if (ok) void run(() => removePlayer(p.id));
                }}
                disabled={busy}
                className="rounded-lg px-2.5 py-1.5 text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
                aria-label={t('common.delete')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SortChip({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-2 font-semibold',
        active
          ? 'border-[var(--color-accent)] text-[var(--color-text)]'
          : 'border-[var(--color-border)] text-[var(--color-text-dim)]',
      )}
    >
      {children} {active ? (dir === 'asc' ? '▲' : '▼') : ''}
    </button>
  );
}
