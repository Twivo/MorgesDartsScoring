/**
 * Lightweight FR / EN internationalisation. A tiny dictionary + `t(key)` hook.
 * The chosen language is a UI preference (kept in localStorage — not match
 * data), defaulting to the browser language. Covers the player-facing flows
 * (home, live, TV); `t` falls back to the key so untranslated strings are safe.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

export type Lang = 'fr' | 'en';
const KEY = 'darts:lang';

const DICT: Record<string, { en: string; fr: string }> = {
  'home.tagline': {
    en: 'Match scoring — 501 / 601 Double Out',
    fr: 'Scoring de match — 501 / 601 Double Out',
  },
  'home.new': { en: 'New training game', fr: "Nouvelle partie d'entraînement" },
  'home.championship': { en: '🏆 Championship match', fr: '🏆 Match de championnat' },
  'home.live': { en: '📺 Watch live', fr: '📺 En direct' },
  'home.tv': { en: '📺 Club TV mode', fr: '📺 Mode TV du club' },
  'home.admin': { en: 'Statistics', fr: 'Statistiques' },
  'home.resume': { en: 'Resume →', fr: 'Reprendre →' },
  'home.gameInProgress': { en: 'Game in progress', fr: 'Partie en cours' },
  'home.gamesInProgress': { en: 'games in progress', fr: 'parties en cours' },
  'home.champInProgress': {
    en: '🏆 Championship in progress',
    fr: '🏆 Championnat en cours',
  },
  'home.match': { en: 'match', fr: 'match' },
  'home.syncing': { en: 'Syncing…', fr: 'Synchronisation…' },
  'home.celebrationRulesButton': { en: 'Very official rules', fr: 'Règlement anti-rabat-joie' },
  'home.celebrationRulesTitle': { en: 'The anti-killjoy rulebook', fr: 'Le règlement anti-rabat-joie' },
  'home.celebrationRule.1': {
    en: 'If you hit a nice checkout, celebrate. If someone sighs, do it again, slower.',
    fr: 'Si tu fais un beau checkout, tu célèbres. Si quelqu’un soupire, tu recommences plus lentement.',
  },
  'home.celebrationRule.2': {
    en: 'A quietly announced 180 only counts halfway. The whole room needs to know.',
    fr: 'Un 180 annoncé calmement ne compte qu’à moitié. Il faut que la salle soit au courant.',
  },
  'home.celebrationRule.3': {
    en: 'Any “come on, enough” automatically adds five seconds of celebration.',
    fr: 'Toute phrase du style “ça va, c’est bon” ajoute automatiquement 5 secondes de célébration.',
  },
  'home.celebrationRule.4': {
    en: 'If someone says “we’re not on TV”, immediately play like it is the world final.',
    fr: 'Si quelqu’un dit “on n’est pas à la télé”, il faut immédiatement jouer comme si on était en finale mondiale.',
  },
  'home.celebrationRule.5': {
    en: 'A double 1 that goes in deserves the same respect as a 170. Sometimes more, because there was pain.',
    fr: 'Un double 1 qui rentre mérite autant de respect qu’un 170. Parfois plus, parce qu’il y avait de la souffrance.',
  },
  'home.celebrationRule.6': {
    en: 'The player pretending not to watch the celebration is officially the main audience.',
    fr: 'Le joueur qui fait semblant de ne pas regarder la célébration est officiellement le public principal.',
  },
  'home.celebrationRule.7': {
    en: 'An ugly checkout is celebrated too. Beauty is a social construct.',
    fr: 'Un check dégueulasse, ça se fête aussi. La beauté est une construction sociale.',
  },
  'home.celebrationRule.8': {
    en: 'If your opponent rolls their eyes, they saw it. Mission accomplished.',
    fr: 'Si ton adversaire lève les yeux au ciel, c’est qu’il a vu. Mission accomplie.',
  },
  'home.celebrationRule.9': {
    en: 'A forced “well played” is accepted, but it must come with a devastated look.',
    fr: 'Le “bien joué” forcé est accepté, mais il doit être accompagné d’un regard détruit.',
  },
  'home.celebrationRule.10': {
    en: 'Any criticized celebration may be replayed in the extended version next leg.',
    fr: 'Toute célébration critiquée pourra être rejouée en version longue au prochain leg.',
  },
  'common.home': { en: '← Home', fr: '← Accueil' },
  'common.back': { en: '← Back', fr: '← Retour' },
  'common.backToApp': { en: '← Back to app', fr: "← Retour à l'application" },
  'common.app': { en: '← App', fr: '← Application' },
  'common.cancel': { en: 'Cancel', fr: 'Annuler' },
  'common.confirm': { en: 'Confirm', fr: 'Confirmer' },
  'common.save': { en: 'Save', fr: 'Enregistrer' },
  'common.saving': { en: 'Saving…', fr: 'Enregistrement…' },
  'common.loadingShort': { en: 'Loading…', fr: 'Chargement…' },
  'common.loading': { en: 'Loading…', fr: 'Chargement…' },
  'common.dash': { en: '—', fr: '—' },
  'common.vs': { en: 'vs', fr: 'contre' },
  'common.final': { en: 'Final', fr: 'Final' },
  'common.live': { en: 'Live', fr: 'Direct' },
  'common.player': { en: 'player', fr: 'joueur' },
  'common.players': { en: 'players', fr: 'joueurs' },
  'common.match': { en: 'match', fr: 'match' },
  'common.matches': { en: 'matches', fr: 'matchs' },
  'common.close': { en: 'Close', fr: 'Fermer' },
  'common.delete': { en: 'Delete', fr: 'Supprimer' },
  'common.search': { en: 'Search…', fr: 'Rechercher…' },
  'common.current': { en: 'current', fr: 'en cours' },
  'common.winner': { en: 'winner', fr: 'vainqueur' },
  'common.won': { en: 'won', fr: 'a gagné' },
  'common.inProgress': { en: 'in progress', fr: 'en cours' },
  'common.forfeit': { en: 'forfeit', fr: 'forfait' },
  'common.encounter': { en: 'encounter', fr: 'rencontre' },
  'common.encounters': { en: 'encounters', fr: 'rencontres' },
  'common.thisSeason': { en: 'this season', fr: 'cette saison' },
  'common.email': { en: 'Email', fr: 'E-mail' },
  'common.password': { en: 'Password', fr: 'Mot de passe' },
  'game.doubleOut': { en: 'Double Out', fr: 'sortie double' },
  'game.singles': { en: 'Singles', fr: 'Simples' },
  'game.doubles': { en: 'Doubles', fr: 'Doubles' },
  'game.legs': { en: 'legs', fr: 'legs' },
  'game.leg': { en: 'leg', fr: 'leg' },
  'game.firstTo': { en: 'first to', fr: 'premier à' },
  'game.throwing': { en: 'throwing', fr: 'lance' },
  'game.winner': { en: 'winner', fr: 'vainqueur' },
  'game.avg': { en: 'avg', fr: 'moy.' },
  'game.toThrow': { en: '{player} to throw', fr: 'À {player} de lancer' },
  'game.toThrowSuffix': { en: 'to throw', fr: 'doit lancer' },
  'game.checkout': { en: 'checkout {score}', fr: 'finish {score}' },
  'game.visitsLeg': { en: 'visits · leg {leg}', fr: 'visites · leg {leg}' },
  'game.scoreLeft': { en: 'score · left', fr: 'score · reste' },
  'game.bust': { en: 'BUST', fr: 'BUST' },
  'game.typeScore': { en: 'Type a score', fr: 'Saisir un score' },
  'game.finishHint': { en: 'Finish — hold 1 / 2 / 3 for the darts used', fr: 'Finish — maintenir 1 / 2 / 3 pour le nombre de fléchettes' },
  'game.miss': { en: 'Miss', fr: 'Manqué' },
  'game.validate': { en: 'Validate', fr: 'Valider' },
  'game.remaining': { en: 'Remaining', fr: 'Reste' },
  'game.remainingTap': { en: 'Remaining (tap to validate)', fr: 'Reste (toucher pour valider)' },
  'game.darts': { en: 'darts', fr: 'fléchettes' },
  'game.hold': { en: 'hold', fr: 'maintenir' },
  'game.legComplete': { en: 'Leg {leg} complete!', fr: 'Leg {leg} terminé !' },
  'game.checkedOut': { en: '{player} checked out {score}', fr: '{player} a terminé {score}' },
  'game.finalDartsQuestion': { en: 'How many darts were used on this final visit?', fr: 'Combien de fléchettes ont été utilisées sur cette visite finale ?' },
  'game.cannotCheckoutInDarts': { en: '{score} cannot be checked out in {darts} {unit}', fr: '{score} ne peut pas être terminé en {darts} {unit}' },
  'game.dartSingular': { en: 'dart', fr: 'fléchette' },
  'game.needsDarts': { en: '{score} needs at least {darts} darts to finish', fr: '{score} nécessite au moins {darts} fléchettes pour finir' },
  'game.loadingMatch': { en: 'Loading match…', fr: 'Chargement du match…' },
  'game.resumeProtected': { en: '🔒 Resuming a match in progress is protected. Sign in with the organizer account to take control.', fr: '🔒 La reprise d’un match en cours est protégée. Connectez-vous avec le compte organisateur pour prendre le contrôle.' },
  'game.lockedTitle': { en: 'Match in progress elsewhere', fr: 'Match en cours ailleurs' },
  'game.lockedText': { en: 'This match is being scored on another device. You can follow it live, or take over once that device stops.', fr: 'Ce match est scoré sur un autre appareil. Vous pouvez le suivre en direct ou reprendre la main quand cet appareil s’arrête.' },
  'game.undo': { en: '↩ Undo', fr: '↩ Annuler' },
  'game.forfeitLeg': { en: 'Forfeit leg', fr: 'Abandonner le leg' },
  'game.forfeitMatch': { en: 'Forfeit match', fr: 'Abandonner le match' },
  'game.forfeitLegTitle': { en: 'Forfeit this leg?', fr: 'Abandonner ce leg ?' },
  'game.forfeitLegMessage': { en: 'The leg will be awarded to the opponent. {player} forfeits.', fr: 'Le leg sera attribué à l’adversaire. {player} abandonne.' },
  'game.forfeitMatchTitle': { en: 'Forfeit the match?', fr: 'Abandonner le match ?' },
  'game.forfeitMatchMessage': { en: 'The match ends immediately. The opponent wins and partial stats are generated.', fr: 'Le match se termine immédiatement. L’adversaire gagne et les statistiques partielles sont générées.' },
  'game.offlineTitle': { en: 'Offline — the game is kept in memory and will save automatically once the connection is back', fr: 'Hors ligne — la partie reste en mémoire et sera enregistrée automatiquement au retour de la connexion' },
  'game.savingTitle': { en: 'Saving to the database…', fr: 'Enregistrement en base…' },
  'game.offlineRetrying': { en: 'Offline — retrying', fr: 'Hors ligne — nouvelle tentative' },
  'game.starts': { en: '{starter} starts', fr: '{starter} commence' },
  'game.shortInfo': { en: '{variant} DO · first to {legs}', fr: '{variant} DO · premier à {legs}' },
  'validation.scoreRange': { en: 'Score must be between 0 and 180.', fr: 'Le score doit être compris entre 0 et 180.' },
  'validation.impossible': { en: 'Impossible score with three darts.', fr: 'Score impossible avec trois fléchettes.' },
  'validation.overRemaining': { en: 'Score is higher than what’s left ({remaining}).', fr: 'Le score est supérieur au reste ({remaining}).' },
  'validation.leavesOne': { en: 'Cannot leave 1 — a double is required to finish.', fr: 'Impossible de laisser 1 — un double est nécessaire pour finir.' },
  'validation.invalidCheckout': { en: '{remaining} cannot be checked out.', fr: '{remaining} ne peut pas être terminé.' },
  'validation.leaveMore': { en: 'You can’t leave more than {remaining}.', fr: 'Impossible de laisser plus que {remaining}.' },
  'validation.exceeds180': { en: 'That visit would exceed 180.', fr: 'Cette visite dépasserait 180.' },
  'live.title': { en: '📺 Live matches', fr: '📺 Matchs en direct' },
  'live.none': {
    en: 'No match is being played right now.',
    fr: 'Aucun match en cours pour le moment.',
  },
  'live.back': { en: '← Live matches', fr: '← Matchs en direct' },
  'live.gone': {
    en: 'This match is no longer available.',
    fr: 'Ce match n’est plus disponible.',
  },
  'live.championship': { en: 'championship', fr: 'championnat' },
  'live.finished': {
    en: '🏆 Championship match finished — see the full recap below.',
    fr: '🏆 Match de championnat terminé — voir le récapitulatif ci-dessous.',
  },
  'live.waiting': {
    en: 'Match finished — waiting for the next match…',
    fr: 'Match terminé — en attente du match suivant…',
  },
  'live.scan': { en: 'Scan to watch live', fr: 'Scanne pour suivre en direct' },
  'live.scanShort': { en: 'Scan to watch', fr: 'Scanne pour regarder' },
  'live.matchLabel': { en: 'match {n} of {total}', fr: 'match {n} sur {total}' },
  'tv.title': { en: 'Club TV', fr: 'TV du club' },
  'tv.exit': { en: 'Exit', fr: 'Quitter' },
  'tv.live': { en: 'live', fr: 'en direct' },
  'tv.idle': {
    en: 'No live match right now',
    fr: 'Aucun match en direct pour le moment',
  },
  'tv.idleHint': {
    en: 'This screen updates automatically when a match starts.',
    fr: 'Cet écran se met à jour automatiquement quand un match démarre.',
  },
  'setup.title': { en: 'New training game', fr: "Nouvelle partie d'entraînement" },
  'setup.gameType': { en: 'Game type', fr: 'Type de partie' },
  'setup.mode': { en: 'Mode', fr: 'Mode' },
  'setup.legsToWin': { en: 'Legs to win (first to)', fr: 'Legs à gagner' },
  'setup.players': { en: 'Players', fr: 'Joueurs' },
  'setup.team': { en: 'Team {side}', fr: 'Équipe {side}' },
  'setup.playerSlot': { en: 'Player {number}', fr: 'Joueur {number}' },
  'setup.addPlayer': { en: '+ Add player', fr: '+ Ajouter un joueur' },
  'setup.removePlayer': { en: 'Remove player', fr: 'Retirer le joueur' },
  'setup.starts': { en: 'Who starts leg 1?', fr: 'Qui commence le leg 1 ?' },
  'setup.bullUp': { en: '🎯 Bull-up', fr: '🎯 Bull-up' },
  'setup.pickManually': { en: 'Pick manually', fr: 'Choisir manuellement' },
  'setup.starterHint': { en: 'The starter alternates automatically every leg.', fr: 'Le joueur qui commence alterne automatiquement à chaque leg.' },
  'setup.continueBull': { en: 'Continue — bull-up', fr: 'Continuer — bull-up' },
  'setup.startGame': { en: 'Start game', fr: 'Démarrer la partie' },
  'setup.bullText': { en: 'Each {unit} throws at the bull. Who landed closest and starts?', fr: 'Chaque {unit} lance au bull. Qui est le plus proche et commence ?' },
  'setup.unitTeam': { en: 'team', fr: 'équipe' },
  'setup.unitPlayer': { en: 'player', fr: 'joueur' },
  'setup.searchPlayers': { en: 'Search players…', fr: 'Rechercher des joueurs…' },
  'setup.noPlayerFound': { en: 'No player found.', fr: 'Aucun joueur trouvé.' },
  'setup.needPlayers': { en: 'You need at least {count} players (add some under Players).', fr: 'Il faut au moins {count} joueurs (ajoutez-en dans Joueurs).' },
  'setup.addEachTeam': { en: 'Add {count} players to each team.', fr: 'Ajoutez {count} joueurs dans chaque équipe.' },
  'setup.addEachSide': { en: 'Add a player to each side.', fr: 'Ajoutez un joueur de chaque côté.' },
  'stats.winner': { en: '{winner} wins the match!', fr: '{winner} gagne le match !' },
  'stats.statistic': { en: 'Statistic', fr: 'Statistique' },
  'stats.correctScore': { en: '↩ Back — correct the score', fr: '↩ Retour — corriger le score' },
  'stats.row.legs': { en: 'Legs won', fr: 'Legs gagnés' },
  'stats.row.avg': { en: '3-dart average', fr: 'Moyenne 3 fléchettes' },
  'stats.row.first9': { en: 'First 9 avg', fr: 'Moyenne first 9' },
  'stats.row.darts': { en: 'Total darts', fr: 'Total fléchettes' },
  'stats.row.best': { en: 'Best leg (darts)', fr: 'Meilleur leg (fléchettes)' },
  'stats.row.worst': { en: 'Worst leg (darts)', fr: 'Moins bon leg (fléchettes)' },
  'stats.row.high': { en: 'Highest visit', fr: 'Meilleure visite' },
  'stats.row.180': { en: '180s', fr: '180' },
  'stats.row.140': { en: '140+', fr: '140+' },
  'stats.row.100': { en: '100+', fr: '100+' },
  'stats.row.60': { en: '60+', fr: '60+' },
  'stats.row.bust': { en: 'Busts', fr: 'Busts' },
  'stats.row.played': { en: 'P', fr: 'J' },
  'stats.row.wonShort': { en: 'W', fr: 'G' },
  'stats.row.winPct': { en: 'Win%', fr: 'Vict.%' },
  'stats.row.first3': { en: 'First 3', fr: 'First 3' },
  'stats.row.avgCheckout': { en: 'Avg CO', fr: 'CO moy.' },
  'stats.row.bestCheckout': { en: 'Best CO', fr: 'Meilleur CO' },
  'stats.row.highShort': { en: 'High', fr: 'Max' },
  'stats.row.bestLeg': { en: 'Best leg', fr: 'Meilleur leg' },
  'stats.row.player': { en: 'Player', fr: 'Joueur' },
  'stats.row.stat': { en: 'Stat', fr: 'Stat' },
  'admin.title': { en: 'Statistics', fr: 'Statistiques' },
  'admin.players': { en: 'Players', fr: 'Joueurs' },
  'admin.teams': { en: 'Teams', fr: 'Équipes' },
  'admin.championship': { en: 'Championship', fr: 'Championnat' },
  'admin.seasonReview': { en: 'Season review', fr: 'Bilan de saison' },
  'admin.signOut': { en: 'Sign out', fr: 'Déconnexion' },
  'admin.season': { en: 'Season', fr: 'Saison' },
  'admin.signInTitle': { en: 'Statistics sign in', fr: 'Connexion statistiques' },
  'admin.signIn': { en: 'Sign in', fr: 'Se connecter' },
  'admin.signingIn': { en: 'Signing in…', fr: 'Connexion…' },
  'admin.signInFailed': { en: 'Sign-in failed', fr: 'Échec de connexion' },
  'admin.restricted': { en: 'Restricted area — authorized staff only.', fr: 'Zone réservée — personnel autorisé uniquement.' },
  'admin.cloudUnavailable': { en: 'Cloud backend not configured — statistics are unavailable.', fr: 'Backend cloud non configuré — les statistiques sont indisponibles.' },
  'admin.actionFailed': { en: 'Action failed', fr: 'Action impossible' },
  'admin.failedLoadTeams': { en: 'Failed to load teams', fr: 'Impossible de charger les équipes' },
  'admin.newPlayerName': { en: 'New player name', fr: 'Nom du nouveau joueur' },
  'admin.addPlayer': { en: 'Add player', fr: 'Ajouter un joueur' },
  'admin.name': { en: 'Name', fr: 'Nom' },
  'admin.added': { en: 'Added', fr: 'Ajouté' },
  'admin.noPlayers': { en: 'No players yet.', fr: 'Aucun joueur pour le moment.' },
  'admin.noMatch': { en: 'No match.', fr: 'Aucun résultat.' },
  'admin.inactive': { en: 'inactive', fr: 'inactif' },
  'admin.deactivate': { en: 'Deactivate', fr: 'Désactiver' },
  'admin.activate': { en: 'Activate', fr: 'Activer' },
  'admin.deletePlayerTitle': { en: 'Delete {name}?', fr: 'Supprimer {name} ?' },
  'admin.deletePlayerMessage': { en: 'If this player has recorded matches, deletion is blocked — deactivate instead.', fr: 'Si ce joueur a des matchs enregistrés, la suppression est bloquée — désactivez-le plutôt.' },
  'admin.newTeamName': { en: 'New team name', fr: 'Nom de la nouvelle équipe' },
  'admin.addTeam': { en: 'Add team', fr: 'Ajouter une équipe' },
  'admin.searchTeams': { en: 'Search teams…', fr: 'Rechercher des équipes…' },
  'admin.noTeams': { en: 'No teams yet.', fr: 'Aucune équipe pour le moment.' },
  'admin.playersButton': { en: 'Players', fr: 'Joueurs' },
  'admin.playerCount': { en: '{count} player', fr: '{count} joueur' },
  'admin.playerCountPlural': { en: '{count} players', fr: '{count} joueurs' },
  'admin.deleteTeamTitle': { en: 'Delete {name}?', fr: 'Supprimer {name} ?' },
  'admin.noMembers': { en: 'No members yet.', fr: 'Aucun membre pour le moment.' },
  'admin.addAPlayer': { en: '+ Add a player…', fr: '+ Ajouter un joueur…' },
  'admin.oneTeamOnly': { en: 'A player can be on one team only.', fr: 'Un joueur ne peut appartenir qu’à une seule équipe.' },
  'admin.allPlayers': { en: 'All players', fr: 'Tous les joueurs' },
  'admin.singlesAndDoubles': { en: 'Singles & Doubles', fr: 'Simples et doubles' },
  'admin.allTime': { en: 'All time', fr: 'Tout' },
  'admin.today': { en: 'Today', fr: 'Aujourd’hui' },
  'admin.last7': { en: 'Last 7 days', fr: '7 derniers jours' },
  'admin.thisMonth': { en: 'This month', fr: 'Ce mois' },
  'admin.thisYear': { en: 'This year', fr: 'Cette année' },
  'admin.custom': { en: 'Custom…', fr: 'Personnalisé…' },
  'admin.counts': { en: '{matches} matches · {players} players', fr: '{matches} matchs · {players} joueurs' },
  'admin.exportCsv': { en: 'CSV', fr: 'CSV' },
  'admin.reviewCounts': { en: '{matches} matches · {encounters} encounters · {players} players', fr: '{matches} matchs · {encounters} rencontres · {players} joueurs' },
  'admin.noStats': { en: 'No stats for these filters yet.', fr: 'Aucune statistique pour ces filtres.' },
  'admin.matchHistory': { en: 'match history', fr: 'historique des matchs' },
  'admin.scoring': { en: 'Scoring', fr: 'Scoring' },
  'admin.noMatchesFilters': { en: 'No matches for these filters.', fr: 'Aucun match pour ces filtres.' },
  'admin.allSeasons': { en: 'All seasons', fr: 'Toutes les saisons' },
  'admin.noPlayerMatches': { en: 'No championship match for this player in this period.', fr: 'Aucun match de championnat pour ce joueur sur cette période.' },
  'admin.wonLost': { en: 'Won / Lost', fr: 'Gagné / Perdu' },
  'admin.winRate': { en: 'Win rate', fr: 'Taux de victoire' },
  'admin.winShort': { en: 'W', fr: 'G' },
  'admin.lossShort': { en: 'L', fr: 'P' },
  'admin.avgTrendTitle': { en: 'Average over time (per match)', fr: 'Moyenne dans le temps (par match)' },
  'admin.records': { en: 'Records', fr: 'Records' },
  'admin.headToHead': { en: 'Head-to-head', fr: 'Face-à-face' },
  'admin.bestMatchAvg': { en: 'Best match avg', fr: 'Meilleure moy. match' },
  'admin.most180Match': { en: 'Most 180s (match)', fr: 'Plus de 180 (match)' },
  'admin.selectOpponent': { en: 'Select an opponent…', fr: 'Choisir un adversaire…' },
  'admin.notEnoughTrend': { en: 'Not enough finished matches for a trend yet.', fr: 'Pas encore assez de matchs terminés pour une courbe.' },
  'admin.avgLegend': { en: '3-dart average per match', fr: 'Moyenne 3 fléchettes par match' },
  'admin.best': { en: 'Best {value}', fr: 'Meilleur {value}' },
  'admin.latest': { en: 'Latest {value}', fr: 'Dernier {value}' },
  'admin.recentMatches': { en: 'Recent matches', fr: 'Matchs récents' },
  'admin.trendAria': { en: '3-dart average trend by match', fr: 'Courbe de moyenne 3 fléchettes par match' },
  'admin.topAverages': { en: 'Top averages', fr: 'Meilleures moyennes' },
  'admin.most180s': { en: 'Most 180s', fr: 'Plus de 180' },
  'admin.mostLegsWon': { en: 'Most legs won', fr: 'Plus de legs gagnés' },
  'admin.seasonReviewTitle': { en: '🏆 Season review', fr: '🏆 Bilan de saison' },
  'admin.noSeasonMatches': { en: 'No championship match played in {season} yet.', fr: 'Aucun match de championnat joué sur {season} pour le moment.' },
  'award.mvp': { en: 'MVP (3-dart avg)', fr: 'MVP (moy. 3 fléchettes)' },
  'award.bestCheckout': { en: 'Best checkout', fr: 'Meilleur checkout' },
  'award.most180s': { en: 'Most 180s', fr: 'Plus de 180' },
  'award.bestFirst9': { en: 'Best First 9', fr: 'Meilleur First 9' },
  'award.mostLegsWon': { en: 'Most legs won', fr: 'Plus de legs gagnés' },
  'award.mostWins': { en: 'Most wins', fr: 'Plus de victoires' },
  'champ.loadingEncounter': { en: 'Loading encounter…', fr: 'Chargement de la rencontre…' },
  'champ.matchOf': { en: 'Match {current} / {total}', fr: 'Match {current} / {total}' },
  'champ.left': { en: '{count} left', fr: '{count} restants' },
  'champ.configure': { en: '⚙ Configure', fr: '⚙ Configurer' },
  'champ.configureTitle': { en: 'Configure encounter', fr: 'Configurer la rencontre' },
  'champ.legsToWin': { en: 'Legs to win', fr: 'Legs à gagner' },
  'champ.starts': { en: 'Starts', fr: 'Commence' },
  'champ.startMode': { en: 'Start mode', fr: 'Mode de départ' },
  'champ.bull': { en: 'Bull', fr: 'Bull' },
  'champ.fixed': { en: 'Fixed', fr: 'Fixe' },
  'champ.alternate': { en: 'Alternate', fr: 'Alterner' },
  'champ.notStartedApply': { en: 'Applies to matches not started yet.', fr: 'S’applique aux matchs pas encore démarrés.' },
  'champ.played': { en: 'played', fr: 'joué' },
  'champ.composeDoubles': { en: 'Compose the doubles', fr: 'Composer les doubles' },
  'champ.composeFirstSingles': { en: 'Compose the first singles', fr: 'Composer les premiers simples' },
  'champ.composeLastSingles': { en: 'Compose the last singles', fr: 'Composer les derniers simples' },
  'champ.double': { en: 'Double', fr: 'Double' },
  'champ.single': { en: 'Single', fr: 'Simple' },
  'champ.starting': { en: 'Starting…', fr: 'Démarrage…' },
  'champ.startEncounter': { en: 'Start encounter ▶', fr: 'Démarrer la rencontre ▶' },
  'champ.continue': { en: 'Continue ▶', fr: 'Continuer ▶' },
  'champ.previousMatch': { en: '↩ Previous match', fr: '↩ Match précédent' },
  'champ.bullUp': { en: 'Bull-up', fr: 'Bull-up' },
  'champ.playersOrder': { en: 'Players (throwing order)', fr: 'Joueurs (ordre de lancer)' },
  'champ.players': { en: 'Players', fr: 'Joueurs' },
  'champ.whoWonBull': { en: 'Who won the bull and starts?', fr: 'Qui a gagné le bull et commence ?' },
  'champ.selectPlayersToStart': { en: 'Select {text} for each team to start.', fr: 'Sélectionnez {text} par équipe pour démarrer.' },
  'champ.twoPlayers': { en: 'two players', fr: 'deux joueurs' },
  'champ.onePlayer': { en: 'a player', fr: 'un joueur' },
  'champ.startMatch': { en: 'Start match ▶', fr: 'Démarrer le match ▶' },
  'champ.selectPlayer': { en: 'Select player', fr: 'Choisir un joueur' },
  'champ.loadingResult': { en: 'Loading result…', fr: 'Chargement du résultat…' },
  'champ.result': { en: 'result', fr: 'résultat' },
  'champ.seeFinal': { en: 'See final result ▶', fr: 'Voir le résultat final ▶' },
  'champ.continueToDecider': {
    en: 'Continue to decisive doubles ▶',
    fr: 'Continuer vers le double décisif ▶',
  },
  'champ.nextMatch': { en: '▶ Next match', fr: '▶ Match suivant' },
  'champ.finishEncounter': { en: 'Finish encounter', fr: 'Terminer la rencontre' },
  'champ.matchFinishedSaving': { en: 'Match finished — saving…', fr: 'Match terminé — enregistrement…' },
  'champ.teamAvg': { en: 'team avg {value}', fr: 'moy. équipe {value}' },
  'champ.decider': { en: 'Decisive doubles', fr: 'Double décisif' },
  'champ.deciderTag': { en: '★ Decider', fr: '★ Décisif' },
  'champ.composeDecider': { en: 'Decisive doubles', fr: 'Double décisif' },
  'champ.deciderHint': {
    en: 'Level score — pick a fresh pair on each side (one that has not played together in this encounter).',
    fr: 'Score à égalité — choisissez une paire inédite par équipe (qui n’a pas déjà joué ensemble dans cette rencontre).',
  },
  'champ.deciderPairUsed': {
    en: 'This pair has already played together — choose another.',
    fr: 'Cette paire a déjà joué ensemble — choisissez-en une autre.',
  },
  'champ.deciderSamePlayer': { en: 'Pick two different players.', fr: 'Choisissez deux joueurs différents.' },
  'champ.startDecider': { en: 'Start decisive doubles ▶', fr: 'Démarrer le double décisif ▶' },
  'champ.individualStats': { en: 'Individual statistics', fr: 'Statistiques individuelles' },
  'champ.noEncounters': { en: 'No championship encounters this season yet.', fr: 'Aucune rencontre de championnat pour cette saison.' },
  'editVisit.title': { en: 'Edit visit', fr: 'Modifier la visite' },
  'editVisit.specialTitle': { en: 'Special visit', fr: 'Visite spéciale' },
  'editVisit.help': { en: 'Visit score (0–180) — same rules as live entry. Everything recalculates instantly.', fr: 'Score de la visite (0–180) — mêmes règles que la saisie en direct. Tout est recalculé immédiatement.' },
  'editVisit.dartsUsed': { en: 'Darts used to check out', fr: 'Fléchettes utilisées pour finir' },
  'editVisit.notEditable': { en: 'This entry ({type}) cannot be edited.', fr: 'Cette entrée ({type}) ne peut pas être modifiée.' },
  'visitHistory.empty': { en: 'No visits yet this leg.', fr: 'Aucune visite pour ce leg.' },
  'encounterSetup.title': { en: 'Championship match', fr: 'Match de championnat' },
  'encounterSetup.description': { en: 'Team tie — 4 singles, 2 doubles, 4 singles (10 matches), first to 2 legs.', fr: 'Rencontre par équipes — 4 simples, 2 doubles, 4 simples (10 matchs), premier à 2 legs.' },
  'encounterSetup.homeTeam': { en: 'Home team', fr: 'Équipe à domicile' },
  'encounterSetup.opponent': { en: 'Opponent', fr: 'Adversaire' },
  'encounterSetup.homeBadge': { en: 'Home', fr: 'Domicile' },
  'encounterSetup.pickBoth': { en: 'Pick both teams.', fr: 'Sélectionnez les deux équipes.' },
  'encounterSetup.differentTeams': { en: 'Teams must be different.', fr: 'Les équipes doivent être différentes.' },
  'encounterSetup.minPlayers': { en: 'Each team needs at least 4 players (add them under Statistics → Teams).', fr: 'Chaque équipe doit avoir au moins 4 joueurs (ajoutez-les dans Statistiques → Équipes).' },
  'encounterSetup.noSeason': { en: 'No current season.', fr: 'Aucune saison en cours.' },
  'encounterSetup.createFailed': { en: 'Failed to create encounter', fr: 'Impossible de créer la rencontre' },
  'encounterSetup.noTeams': { en: 'No teams yet — create them under Statistics → Teams.', fr: 'Aucune équipe — créez-en dans Statistiques → Équipes.' },
  'encounterSetup.creating': { en: 'Creating…', fr: 'Création…' },
  'encounterSetup.composeFirst': { en: 'Compose first singles →', fr: 'Composer les premiers simples →' },
};

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}
const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s === 'fr' || s === 'en') return s;
    } catch {
      /* ignore */
    }
    return typeof navigator !== 'undefined' &&
      navigator.language?.toLowerCase().startsWith('fr')
      ? 'fr'
      : 'en';
  });
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback((key: string) => DICT[key]?.[lang] ?? key, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useT must be used within a LangProvider');
  return ctx;
}

/** FR / EN switch. */
export function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-[var(--color-border)] text-xs">
      {(['fr', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            'px-2.5 py-1 font-bold uppercase transition-colors',
            lang === l
              ? 'bg-[var(--color-accent)] text-white'
              : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
