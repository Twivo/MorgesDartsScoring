// Seed 10 championship encounters (round-robin over the 5 teams).
// Format 4 singles / 2 doubles / 4 singles, first-to-2 legs, alternate starter.
// Each fixture is a fully-played, coherent ~50-avg 501 match linked by encounter_id.
import { randomUUID } from 'node:crypto';

const SB = process.env.SB_URL, KEY = process.env.SB_SERVICE_KEY, SEASON_ID = process.env.SEASON_ID;
if (!SB || !KEY || !SEASON_ID) { console.error('missing env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
async function post(t, rows) {
  const r = await fetch(`${SB}/rest/v1/${t}`, { method: 'POST', headers: H, body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(`${t} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function get(t, qs) {
  const r = await fetch(`${SB}/rest/v1/${t}?${qs}`, { headers: H });
  if (!r.ok) throw new Error(`${t} ${r.status}: ${await r.text()}`);
  return r.json();
}

// --- deterministic RNG -------------------------------------------------------
let seed = 135790;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const POOL = [26,30,36,38,40,41,43,44,45,50,55,57,58,60,61,66,81,85];
const FINISHES = [40,32,36,50,60];
function sumVisits(k, target) {
  for (let t = 0; t < 5000; t++) {
    const v = []; for (let i = 0; i < k - 1; i++) v.push(pick(POOL));
    const last = target - v.reduce((a,b)=>a+b,0);
    if (last >= 20 && last <= 110) return [...v, last];
  }
  throw new Error('sumVisits failed');
}
function resolveVisit(rem, scored) {
  const nr = rem - scored;
  if (nr < 0 || nr === 1) return { isBust: true, isCheckout: false, rem };
  return { isBust: false, isCheckout: nr === 0, rem: nr };
}

// One leg where the STARTER wins. Returns [{side, scored}] interleaved.
function makeLeg(starterSide, otherSide, variant = 501) {
  const finish = pick(FINISHES);
  const win = [...sumVisits(9, variant - finish), finish]; // 10 visits, checkout last
  const lose = sumVisits(9, 420 + Math.floor(rnd() * 40));  // 9 visits, no checkout
  const seq = [];
  for (let i = 0; i < win.length; i++) {
    seq.push({ side: starterSide, scored: win[i] });
    if (i < lose.length) seq.push({ side: otherSide, scored: lose[i] });
  }
  return seq;
}

// A full first-to-2 match won by `winnerSide` (2-1): starter wins every leg,
// starters alternate [winner, loser, winner]. participants order is [A,B].
function makeMatch(kind, winnerSide, aIds, bIds, variant = 501) {
  const loserSide = winnerSide === 'A' ? 'B' : 'A';
  const legStarters = [winnerSide, loserSide, winnerSide];
  const idsOf = (s) => (s === 'A' ? aIds : bIds);
  const events = [];
  // Per-leg simulation to validate + assign alternating players (DOUBLE).
  const totals = { A: { s: 0, d: 0 }, B: { s: 0, d: 0 } };
  const legsWon = { A: 0, B: 0 };
  for (const starter of legStarters) {
    if (legsWon[winnerSide] >= 2) break;
    const other = starter === 'A' ? 'B' : 'A';
    const seq = makeLeg(starter, other, variant);
    const rem = { A: variant, B: variant };
    const cnt = { A: 0, B: 0 }; // per-participant visit count this leg (player alternation)
    let legWinner = null;
    for (let pos = 0; pos < seq.length; pos++) {
      const side = pos % 2 === 0 ? starter : other; // engine derives owner by position
      if (side !== seq[pos].side) throw new Error('turn-order mismatch');
      const ids = idsOf(side);
      const playerId = ids[cnt[side] % ids.length];
      const out = resolveVisit(rem[side], seq[pos].scored);
      rem[side] = out.rem;
      totals[side].s += out.isBust ? 0 : seq[pos].scored;
      totals[side].d += 3;
      events.push({ id: randomUUID(), type: 'VISIT', participantId: side, playerId, scored: seq[pos].scored, darts: 3 });
      cnt[side]++;
      if (out.isCheckout) { legWinner = side; break; }
    }
    if (legWinner !== starter) throw new Error('leg not won by starter');
    legsWon[legWinner]++;
  }
  if (legsWon[winnerSide] !== 2) throw new Error(`match not 2-x for ${winnerSide}`);
  const avg = (t) => +((t.s / t.d) * 3).toFixed(1);
  return { events, legsWon, avgA: avg(totals.A), avgB: avg(totals.B) };
}

// --- load teams + players ----------------------------------------------------
const teamRows = await get('teams', 'select=id,name');
const playerRows = await get('players', 'select=id,name&limit=1000');
const nameById = Object.fromEntries(playerRows.map((p) => [p.id, p.name]));
const tpRows = await get('team_players', 'select=team_id,player_id&limit=1000');
const teamPlayers = {}; // teamId -> [{id,name}]
for (const r of teamRows) teamPlayers[r.id] = [];
for (const r of tpRows) teamPlayers[r.team_id]?.push({ id: r.player_id, name: nameById[r.player_id] });
const teams = teamRows.map((t) => ({ id: t.id, name: t.name, players: teamPlayers[t.id] }));

// round-robin (C(5,2)=10); for round 2/3 we add return legs (home/away swapped)
const rr = [];
for (let i = 0; i < teams.length; i++)
  for (let j = i + 1; j < teams.length; j++) rr.push([teams[i], teams[j]]);
const ret = rr.map(([a, b]) => [b, a]);        // 10 return legs
const pairings = [...ret, ...rr.slice(0, 5)];  // 10 + 5 = 15

const FORMAT = [{ kind: 'SINGLE', count: 4 }, { kind: 'DOUBLE', count: 2 }, { kind: 'SINGLE', count: 4 }];
const SETTINGS = { legsToWin: 2, startingPolicy: 'BULL', alternateStarter: true, starterSide: 'A' };

console.log(`Creating ${pairings.length} encounters...`);
let ei = 0;
for (const [teamA, teamB] of pairings) {
  const encId = randomUUID();
  // Decide fixture winners so the encounter is never level (avoid 5-5).
  const winners = Array.from({ length: 10 }, () => (rnd() < 0.5 ? 'A' : 'B'));
  if (winners.filter((w) => w === 'A').length === 5) {
    winners[winners.indexOf('B')] = 'A'; // force 6-4, never level
  }
  const scoreA = winners.filter((w) => w === 'A').length;
  const scoreB = 10 - scoreA;
  const encWinner = scoreA > scoreB ? 'A' : 'B';

  const fixtures = [];
  const matchInserts = [];
  const mpInserts = [];
  let idx = 0;
  for (const slot of FORMAT) {
    for (let k = 0; k < slot.count; k++) {
      const kind = slot.kind;
      const winnerSide = winners[idx];
      // compose lineups (rotate through rosters; doubles use distinct pairs)
      let aIds, bIds;
      if (kind === 'SINGLE') {
        aIds = [teamA.players[idx % teamA.players.length].id];
        bIds = [teamB.players[idx % teamB.players.length].id];
      } else {
        const dOff = idx - 4; // 0 or 1 -> pairs (0,1) then (2,3)
        aIds = [teamA.players[(dOff * 2) % teamA.players.length].id, teamA.players[(dOff * 2 + 1) % teamA.players.length].id];
        bIds = [teamB.players[(dOff * 2) % teamB.players.length].id, teamB.players[(dOff * 2 + 1) % teamB.players.length].id];
      }
      const m = makeMatch(kind, winnerSide, aIds, bIds);
      const matchId = randomUUID();
      const nowBase = Date.now() - (pairings.length - ei) * 86400000 + idx * 600000;
      const config = {
        id: randomUUID(), createdAt: nowBase, variant: 501, outRule: 'DOUBLE', mode: kind,
        legsToWin: 2,
        participants: [
          { id: 'A', label: kind === 'SINGLE' ? nameById[aIds[0]] : `${teamA.name} A`, playerIds: aIds },
          { id: 'B', label: kind === 'SINGLE' ? nameById[bIds[0]] : `${teamB.name} B`, playerIds: bIds },
        ],
        players: [...aIds, ...bIds].map((id) => ({ id, name: nameById[id] })),
        startingPolicy: 'BULL', alternateStarter: true, firstStarterId: winnerSide,
      };
      const events = m.events.map((e, i) => ({ ...e, ts: nowBase + i * 25000 }));
      matchInserts.push({
        id: matchId, season_id: SEASON_ID, config, events, mode: kind, variant: 501,
        status: 'GAME_OVER', winner_participant: winnerSide,
        encounter_id: encId, fixture_index: idx,
        finished_at: new Date(nowBase + events.length * 25000).toISOString(),
      });
      for (const pid of aIds) mpInserts.push({ match_id: matchId, player_id: pid, participant_id: 'A' });
      for (const pid of bIds) mpInserts.push({ match_id: matchId, player_id: pid, participant_id: 'B' });
      fixtures.push({ index: idx, kind, aPlayerIds: aIds, bPlayerIds: bIds, starterSide: winnerSide, matchId, winner: winnerSide });
      idx++;
    }
  }

  const plan = {
    format: FORMAT, settings: SETTINGS,
    teams: {
      A: { id: teamA.id, name: teamA.name, players: teamA.players.map((p) => ({ id: p.id, name: p.name })) },
      B: { id: teamB.id, name: teamB.name, players: teamB.players.map((p) => ({ id: p.id, name: p.name })) },
    },
    fixtures, decider: null,
  };

  const finishedAt = new Date(Date.now() - (pairings.length - ei) * 86400000 + 10 * 600000).toISOString();
  // 1) encounter (plan already carries matchIds) -> 2) matches -> 3) match_players
  await post('encounters', [{
    id: encId, season_id: SEASON_ID, team_a_id: teamA.id, team_b_id: teamB.id,
    plan, status: 'FINISHED', current_index: 10, score_a: scoreA, score_b: scoreB,
    winner: encWinner, finished_at: finishedAt,
  }]);
  await post('matches', matchInserts);
  await post('match_players', mpInserts);
  console.log(`  #${++ei} ${teamA.name} ${scoreA}-${scoreB} ${teamB.name}  -> ${encWinner === 'A' ? teamA.name : teamB.name} (10 fixtures)`);
}
console.log('DONE.');
