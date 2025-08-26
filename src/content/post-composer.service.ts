import { Injectable } from '@nestjs/common';

@Injectable()
export class PostComposerService {
  // Normalize upstream JSON snapshots to small, portable facts
  composePlayerTodayFacts(playerRes: any, teamStatsRes: any) {
    const player = playerRes?.response?.[0]?.player || {};
    const stats = playerRes?.response?.[0]?.statistics?.[0] || {};
    const teamName = stats?.team?.name || 'Unknown Team';
    const leagueName = stats?.league?.name || 'Unknown League';
    const season = stats?.league?.season || null;

    const summary = `${player?.name || 'Player'} | ${teamName} | ${leagueName} ${season ?? ''}`.trim();

    return {
      name: player?.name || 'Unknown',
      team: teamName,
      league: leagueName,
      season: season,
      summary,
      raw: { playerRes, teamStatsRes },
    };
  }

  composeTeamPlayerSeasonFacts(teamStatsRes: any, playerRes: any) {
    const team = teamStatsRes?.response?.team || {};
    const league = teamStatsRes?.response?.league || {};
    const fixtures = teamStatsRes?.response?.fixtures || {};
    const player = playerRes?.response?.[0]?.player || {};

    return {
      team: team?.name,
      league: league?.name,
      season: league?.season,
      fixtures,
      player: { name: player?.name, age: player?.age, nationality: player?.nationality },
      snapshot: { teamStatsRes, playerRes },
    };
  }

  composeMatchFacts(bundle: { fixture: any; events: any; lineups: any }) {
    const fixture = bundle.fixture?.response?.[0] || {};
    const events = bundle.events?.response || [];
    const lineups = bundle.lineups?.response || [];
    const home = fixture?.teams?.home?.name || 'Home';
    const away = fixture?.teams?.away?.name || 'Away';
    const title = `${home} vs ${away}`;

    return {
      title,
      fixture,
      events,
      lineups,
      snapshot: bundle,
    };
  }
}

