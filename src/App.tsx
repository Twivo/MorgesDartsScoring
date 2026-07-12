import { Navigate, Route, Routes } from 'react-router-dom';
import { HomeScreen } from './features/home/HomeScreen';
import { SetupScreen } from './features/setup/SetupScreen';
import { GameRoute } from './features/game/GameRoute';
import { LiveList } from './features/live/LiveList';
import { LiveMatch } from './features/live/LiveMatch';
import { AdminLayout } from './features/admin/AdminLayout';
import { AdminPlayers } from './features/admin/AdminPlayers';
import { PlayerProfile } from './features/admin/PlayerProfile';
import { AdminTeams } from './features/admin/AdminTeams';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminChampionship } from './features/admin/AdminChampionship';
import { SeasonReview } from './features/admin/SeasonReview';
import { RequireAuth } from './features/admin/RequireAuth';
import { EncounterSetup } from './features/championship/EncounterSetup';
import { ChampionshipRoute } from './features/championship/ChampionshipRoute';
import { TeamLayout } from './features/team/TeamLayout';
import { TeamSquad } from './features/team/TeamSquad';
import { TeamEncounterSetup } from './features/team/TeamEncounterSetup';
import { TeamHistory } from './features/team/TeamHistory';
import { TeamStats } from './features/team/TeamStats';

export function App() {
  return (
    <div className="min-h-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/new" element={<SetupScreen />} />
        <Route path="/game/:id" element={<GameRoute />} />

        {/* Live spectating — public, read-only (no scoring controls) */}
        <Route path="/live" element={<LiveList />} />
        <Route path="/live/:id" element={<LiveMatch />} />

        {/* Championship — gated by admin auth (scoring with login) */}
        <Route
          path="/championship/new"
          element={
            <RequireAuth>
              <EncounterSetup />
            </RequireAuth>
          }
        />
        <Route
          path="/championship/:id"
          element={
            <RequireAuth>
              <ChampionshipRoute />
            </RequireAuth>
          }
        />

        {/* Team space — one login per team (captain), gated inside TeamLayout */}
        <Route path="/team" element={<TeamLayout />}>
          <Route index element={<Navigate to="/team/new" replace />} />
          <Route path="squad" element={<TeamSquad />} />
          <Route path="new" element={<TeamEncounterSetup />} />
          <Route path="history" element={<TeamHistory />} />
          <Route path="stats" element={<TeamStats />} />
          <Route path="players/:id" element={<PlayerProfile />} />
        </Route>

        {/* Admin — fully gated by RequireAuth inside AdminLayout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/players" replace />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="players/:id" element={<PlayerProfile />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="stats" element={<AdminDashboard />} />
          <Route path="championship" element={<AdminChampionship />} />
          <Route path="review" element={<SeasonReview />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
