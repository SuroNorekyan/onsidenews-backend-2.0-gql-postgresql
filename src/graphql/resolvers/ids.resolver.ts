import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import { StatsService } from '../../stats/stats.service';

@Resolver()
export class IdsResolver {
  constructor(private readonly stats: StatsService) {}

  @Query(() => String)
  async leaguesByCountry(@Args('country') country: string): Promise<string> {
    const res = await this.stats.leaguesByCountry(country);
    return JSON.stringify(res);
  }

  @Query(() => String)
  async teamsByLeague(
    @Args('leagueId', { type: () => ID }) leagueId: string,
    @Args('season', { type: () => Int }) season: number,
  ): Promise<string> {
    const res = await this.stats.teamsByLeague(leagueId, season);
    return JSON.stringify(res);
  }

  @Query(() => String)
  async playersSearch(@Args('q') q: string): Promise<string> {
    const res = await this.stats.playersSearch(q);
    return JSON.stringify(res);
  }
}
