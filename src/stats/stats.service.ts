import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderSnapshot } from '../provider-cache/entities/provider-snapshot.entity';
import { ApiFootballClient } from '../apifootball/apifootball.client';

@Injectable()
export class StatsService {
  constructor(
    private readonly api: ApiFootballClient,
    @InjectRepository(ProviderSnapshot)
    private readonly snapshots: Repository<ProviderSnapshot>,
  ) {}

  async leaguesByCountry(country: string) {
    const sampleName = `leagues.${country}.json`;
    return this.api.get('leagues', { country }, { sampleName });
  }

  async teamsByLeague(leagueId: string | number, season: number) {
    const sampleName = `teams.${leagueId}.${season}.json`;
    return this.api.get('teams', { league: leagueId, season }, { sampleName });
  }

  async playersSearch(q: string) {
    const sampleName = `players.search.${q.replace(/\s+/g, '')}.json`;
    return this.api.get('players', { search: q }, { sampleName });
  }

  async playerSeason(playerId: string | number, leagueId: string | number, season: number) {
    return this.api.get(
      'players',
      { id: playerId, league: leagueId, season },
      { sampleName: 'players.playerSeason.json' },
    );
  }

  async teamSeason(teamId: string | number, leagueId: string | number, season: number) {
    return this.api.get(
      'teams/statistics',
      { team: teamId, league: leagueId, season },
      { sampleName: 'teams.teamSeason.json' },
    );
  }

  async fixturesByDateTeam(date: string, teamId: string | number) {
    return this.api.get(
      'fixtures',
      { date, team: teamId },
      { sampleName: 'fixtures.fixture.json' },
    );
  }

  async fixtureBundle(fixtureId: string | number) {
    const [fixture, events, lineups] = await Promise.all([
      this.api.get('fixtures', { id: fixtureId }, { sampleName: 'fixtures.fixture.json' }),
      this.api.get('fixtures/events', { fixture: fixtureId }, { sampleName: 'fixtures.events.json' }),
      this.api.get('fixtures/lineups', { fixture: fixtureId }, { sampleName: 'fixtures.lineups.json' }),
    ]);
    return { fixture, events, lineups };
  }
}
