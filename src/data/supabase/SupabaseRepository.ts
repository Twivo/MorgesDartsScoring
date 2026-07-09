/** Supabase-backed implementation of DartsRepository. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DartsRepository, PlayerInput } from '../repository';
import type {
  EncounterRecord,
  MatchQuery,
  MatchRecord,
  PlayerQuery,
  PlayerRecord,
  Season,
  TeamRecord,
  TeamWithPlayers,
} from '../types';

interface DbPlayer {
  id: string;
  name: string;
  color: string | null;
  active: boolean;
  created_at: string;
}
interface DbSeason {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_current: boolean;
}
interface DbMatch {
  id: string;
  season_id: string;
  config: MatchRecord['config'];
  events: MatchRecord['events'];
  mode: MatchRecord['mode'];
  variant: MatchRecord['variant'];
  status: MatchRecord['status'];
  winner_participant: string | null;
  encounter_id: string | null;
  fixture_index: number | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

const toPlayer = (r: DbPlayer): PlayerRecord => ({
  id: r.id,
  name: r.name,
  color: r.color,
  active: r.active,
  createdAt: r.created_at,
});
const toSeason = (r: DbSeason): Season => ({
  id: r.id,
  name: r.name,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  isCurrent: r.is_current,
});
const toMatch = (r: DbMatch): MatchRecord => ({
  id: r.id,
  seasonId: r.season_id,
  config: r.config,
  events: r.events,
  mode: r.mode,
  variant: r.variant,
  status: r.status,
  winnerParticipant: r.winner_participant,
  encounterId: r.encounter_id,
  fixtureIndex: r.fixture_index,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  finishedAt: r.finished_at,
});

export class SupabaseRepository implements DartsRepository {
  constructor(private readonly sb: SupabaseClient) {}

  async listPlayers(query: PlayerQuery = {}): Promise<PlayerRecord[]> {
    let q = this.sb.from('players').select('*');
    if (query.activeOnly) q = q.eq('active', true);
    if (query.search) q = q.ilike('name', `%${query.search}%`);
    q = q.order(query.sortBy === 'createdAt' ? 'created_at' : 'name', {
      ascending: (query.sortDir ?? 'asc') === 'asc',
    });
    const { data, error } = await q;
    if (error) throw error;
    return (data as DbPlayer[]).map(toPlayer);
  }

  async createPlayer(input: PlayerInput): Promise<PlayerRecord> {
    const { data, error } = await this.sb
      .from('players')
      .insert({
        name: input.name,
        color: input.color ?? null,
        active: input.active ?? true,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toPlayer(data as DbPlayer);
  }

  async updatePlayer(
    id: string,
    patch: Partial<PlayerInput>,
  ): Promise<PlayerRecord> {
    const { data, error } = await this.sb
      .from('players')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toPlayer(data as DbPlayer);
  }

  async deletePlayer(id: string): Promise<void> {
    const { error } = await this.sb.from('players').delete().eq('id', id);
    if (error) throw error;
  }

  async listSeasons(): Promise<Season[]> {
    const { data, error } = await this.sb
      .from('seasons')
      .select('*')
      .order('name', { ascending: false });
    if (error) throw error;
    return (data as DbSeason[]).map(toSeason);
  }

  async getCurrentSeason(): Promise<Season | null> {
    const { data, error } = await this.sb
      .from('seasons')
      .select('*')
      .eq('is_current', true)
      .maybeSingle();
    if (error) throw error;
    return data ? toSeason(data as DbSeason) : null;
  }

  async listMatches(query: MatchQuery = {}): Promise<MatchRecord[]> {
    let q = this.sb.from('matches').select('*');
    // Training matches (New Game, encounter_id IS NULL) and championship
    // matches are kept strictly apart: stats screens pass `championship` to
    // aggregate only championship play, never training games.
    if (query.encounterId) q = q.eq('encounter_id', query.encounterId);
    else if (query.championship) q = q.not('encounter_id', 'is', null);
    else q = q.is('encounter_id', null);
    if (query.seasonId) q = q.eq('season_id', query.seasonId);
    if (query.mode) q = q.eq('mode', query.mode);
    if (query.status) q = q.eq('status', query.status);
    if (query.from) q = q.gte('created_at', query.from);
    if (query.to) q = q.lte('created_at', query.to);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data as DbMatch[]).map(toMatch);
    // player filter: match_players is the source of truth, but for simplicity
    // we filter on the config snapshot which contains the real player ids.
    if (query.playerId) {
      rows = rows.filter((m) =>
        m.config.players.some((p) => p.id === query.playerId),
      );
    }
    return rows;
  }

  async getMatch(id: string): Promise<MatchRecord | null> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toMatch(data as DbMatch) : null;
  }

  async saveMatch(record: MatchRecord): Promise<void> {
    const { error } = await this.sb.from('matches').upsert({
      id: record.id,
      season_id: record.seasonId,
      config: record.config,
      events: record.events,
      mode: record.mode,
      variant: record.variant,
      status: record.status,
      winner_participant: record.winnerParticipant ?? null,
      encounter_id: record.encounterId ?? null,
      fixture_index: record.fixtureIndex ?? null,
      finished_at: record.finishedAt ?? null,
    });
    if (error) throw error;

    // Link players for fast per-player queries (idempotent).
    const links = record.config.participants.flatMap((part) =>
      part.playerIds.map((pid) => ({
        match_id: record.id,
        player_id: pid,
        participant_id: part.id,
      })),
    );
    if (links.length) {
      await this.sb
        .from('match_players')
        .upsert(links, { onConflict: 'match_id,player_id', ignoreDuplicates: true });
    }
  }

  async listInProgress(): Promise<MatchRecord[]> {
    const { data, error } = await this.sb
      .from('matches')
      .select('*')
      .eq('status', 'IN_PROGRESS')
      .is('encounter_id', null) // regular matches only
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as DbMatch[]).map(toMatch);
  }

  async listLiveMatches(): Promise<MatchRecord[]> {
    // Every in-progress match, regular and championship — for the live view.
    const { data, error } = await this.sb
      .from('matches')
      .select('*')
      .eq('status', 'IN_PROGRESS')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as DbMatch[]).map(toMatch);
  }

  // --- teams ---------------------------------------------------------------

  async listTeams(search?: string): Promise<TeamWithPlayers[]> {
    let q = this.sb
      .from('teams')
      .select('id, name, created_at, team_players(player_id)')
      .order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Array<{
      id: string;
      name: string;
      created_at: string;
      team_players: { player_id: string }[];
    }>).map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      playerIds: r.team_players.map((tp) => tp.player_id),
    }));
  }

  async createTeam(name: string): Promise<TeamRecord> {
    const { data, error } = await this.sb
      .from('teams')
      .insert({ name })
      .select('id, name, created_at')
      .single();
    if (error) throw error;
    const r = data as { id: string; name: string; created_at: string };
    return { id: r.id, name: r.name, createdAt: r.created_at };
  }

  async updateTeam(id: string, patch: { name: string }): Promise<TeamRecord> {
    const { data, error } = await this.sb
      .from('teams')
      .update(patch)
      .eq('id', id)
      .select('id, name, created_at')
      .single();
    if (error) throw error;
    const r = data as { id: string; name: string; created_at: string };
    return { id: r.id, name: r.name, createdAt: r.created_at };
  }

  async deleteTeam(id: string): Promise<void> {
    const { error } = await this.sb.from('teams').delete().eq('id', id);
    if (error) throw error;
  }

  async setTeamPlayers(teamId: string, playerIds: string[]): Promise<void> {
    const del = await this.sb.from('team_players').delete().eq('team_id', teamId);
    if (del.error) throw del.error;
    if (playerIds.length) {
      const ins = await this.sb
        .from('team_players')
        .insert(playerIds.map((pid) => ({ team_id: teamId, player_id: pid })));
      if (ins.error) throw ins.error;
    }
  }

  // --- encounters ----------------------------------------------------------

  async getEncounter(id: string): Promise<EncounterRecord | null> {
    const { data, error } = await this.sb
      .from('encounters')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toEncounter(data as DbEncounter) : null;
  }

  async saveEncounter(record: EncounterRecord): Promise<void> {
    const { error } = await this.sb.from('encounters').upsert({
      id: record.id,
      season_id: record.seasonId,
      team_a_id: record.teamAId,
      team_b_id: record.teamBId,
      plan: record.plan,
      status: record.status,
      current_index: record.currentIndex,
      score_a: record.scoreA,
      score_b: record.scoreB,
      winner: record.winner,
      finished_at: record.finishedAt ?? null,
    });
    if (error) throw error;
  }

  async listEncounters(seasonId?: string): Promise<EncounterRecord[]> {
    let q = this.sb.from('encounters').select('*').order('created_at', {
      ascending: false,
    });
    if (seasonId) q = q.eq('season_id', seasonId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as DbEncounter[]).map(toEncounter);
  }

  async listEncountersInProgress(): Promise<EncounterRecord[]> {
    const { data, error } = await this.sb
      .from('encounters')
      .select('*')
      .eq('status', 'IN_PROGRESS')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as DbEncounter[]).map(toEncounter);
  }
}

interface DbEncounter {
  id: string;
  season_id: string;
  team_a_id: string;
  team_b_id: string;
  plan: EncounterRecord['plan'];
  status: EncounterRecord['status'];
  current_index: number;
  score_a: number;
  score_b: number;
  winner: EncounterRecord['winner'];
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

const toEncounter = (r: DbEncounter): EncounterRecord => ({
  id: r.id,
  seasonId: r.season_id,
  teamAId: r.team_a_id,
  teamBId: r.team_b_id,
  plan: r.plan,
  status: r.status,
  currentIndex: r.current_index,
  scoreA: r.score_a,
  scoreB: r.score_b,
  winner: r.winner,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  finishedAt: r.finished_at,
});
