import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { EncounterRecord } from '@/data/types';
import { composeBlock } from '@/store/encounterService';
import { useT } from '@/store/LangContext';
import type { ComposeBlock } from '@/domain/championship/types';

interface Comp {
  index: number;
  a: string[];
  b: string[];
}

/** Compose the fixtures of the current block (singles: 1 each, doubles: 2 each). */
export function FixtureComposer({
  encounter,
  block,
  onComposed,
}: {
  encounter: EncounterRecord;
  block: ComposeBlock;
  onComposed: (updated: EncounterRecord) => void;
}) {
  const { t } = useT();
  const { teams } = encounter.plan;
  const per = block.kind === 'DOUBLE' ? 2 : 1;

  const initial = useMemo<Comp[]>(() => {
    // Do not pre-fill automatically. Exception: propose the singles pairings —
    // the first singles round by position (A-A, B-B, C-C, D-D) and the last one
    // rotated (A-B, B-A, C-D, D-C). Doubles are left empty. All stay editable.
    const isDouble = block.kind === 'DOUBLE';
    const lastSingles = !isDouble && block.start > 0;
    const comps: Comp[] = [];
    for (let i = block.start; i < block.end; i++) {
      const pos = i - block.start;
      if (isDouble) {
        comps.push({ index: i, a: Array(per).fill(''), b: Array(per).fill('') });
      } else {
        const bPos = lastSingles ? pos ^ 1 : pos;
        comps.push({
          index: i,
          a: [teams.A.players[pos]?.id ?? ''],
          b: [teams.B.players[bPos]?.id ?? ''],
        });
      }
    }
    return comps;
  }, [block, per, teams]);

  const [comps, setComps] = useState<Comp[]>(initial);
  const [busy, setBusy] = useState(false);

  const setSlot = (index: number, side: 'a' | 'b', slot: number, value: string) => {
    setComps((prev) =>
      prev.map((c) =>
        c.index === index
          ? { ...c, [side]: c[side].map((v, i) => (i === slot ? value : v)) }
          : c,
      ),
    );
  };

  const complete = comps.every(
    (c) =>
      new Set(c.a).size === per &&
      new Set(c.b).size === per &&
      c.a.every(Boolean) &&
      c.b.every(Boolean),
  );

  const validate = async () => {
    if (!complete || busy) return;
    setBusy(true);
    const updated = await composeBlock(encounter, block, comps);
    onComposed(updated);
  };

  const title =
    block.kind === 'DOUBLE'
      ? t('champ.composeDoubles')
      : block.start === 0
        ? t('champ.composeFirstSingles')
        : t('champ.composeLastSingles');

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 py-4">
      <h2 className="mb-1 text-xl font-black">{title}</h2>
      <p className="mb-4 text-sm text-[var(--color-text-dim)]">
        {teams.A.name} {t('common.vs')} {teams.B.name}
      </p>

      <div className="flex flex-col gap-3">
        {comps.map((c, i) => (
          <div
            key={c.index}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]">
              {block.kind === 'DOUBLE' ? t('champ.double') : t('champ.single')} {i + 1}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SideSlots
                label={teams.A.name}
                players={teams.A.players}
                values={c.a}
                onChange={(slot, v) => setSlot(c.index, 'a', slot, v)}
              />
              <SideSlots
                label={teams.B.name}
                players={teams.B.players}
                values={c.b}
                onChange={(slot, v) => setSlot(c.index, 'b', slot, v)}
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="accent"
        size="xl"
        fullWidth
        className="mt-5"
        disabled={!complete || busy}
        onClick={validate}
      >
        {busy ? t('champ.starting') : block.start === 0 ? t('champ.startEncounter') : t('champ.continue')}
      </Button>
    </div>
  );
}

function SideSlots({
  label,
  players,
  values,
  onChange,
}: {
  label: string;
  players: { id: string; name: string }[];
  values: string[];
  onChange: (slot: number, value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 truncate text-xs font-semibold text-[var(--color-text-dim)]">
        {label}
      </div>
      <div className="flex flex-col gap-1.5">
        {values.map((v, slot) => (
          <select
            key={slot}
            value={v}
            onChange={(e) => onChange(slot, e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">—</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
