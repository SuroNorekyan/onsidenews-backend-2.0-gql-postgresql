import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { StatsService } from '../../stats/stats.service';
import { PlayerToday, GeneratedArticle } from '../types';
import { PostComposerService } from '../../content/post-composer.service';
import { AiWriterService } from '../../content/ai-writer.service';

@Resolver()
export class ContentResolver {
  constructor(
    private readonly stats: StatsService,
    private readonly composer: PostComposerService,
    private readonly writer: AiWriterService,
  ) {}

  @Query(() => PlayerToday)
  async playerToday(
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('leagueId', { type: () => ID }) leagueId: string,
    @Args('season', { type: () => Int }) season: number,
  ): Promise<PlayerToday> {
    const [playerRes, teamStatsRes] = await Promise.all([
      this.stats.playerSeason(playerId, leagueId, season),
      // Use team from player stats if available, otherwise this will be minimal
      this.stats.teamSeason(0, leagueId, season).catch(() => ({ response: {} })),
    ]);
    const facts = this.composer.composePlayerTodayFacts(playerRes, teamStatsRes);
    return {
      name: facts.name,
      team: facts.team,
      league: facts.league,
      season: facts.season,
      summary: facts.summary,
    };
  }

  @Mutation(() => GeneratedArticle)
  async generateTeamPlayerSeasonProfile(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('leagueId', { type: () => ID }) leagueId: string,
    @Args('season', { type: () => Int }) season: number,
    @Args('lang') lang: string,
  ): Promise<GeneratedArticle> {
    const [teamStatsRes, playerRes] = await Promise.all([
      this.stats.teamSeason(teamId, leagueId, season),
      this.stats.playerSeason(playerId, leagueId, season),
    ]);
    const facts = this.composer.composeTeamPlayerSeasonFacts(
      teamStatsRes,
      playerRes,
    );
    return this.writer.writeTeamPlayerSeasonProfile(facts, lang);
  }

  @Mutation(() => GeneratedArticle)
  async generateMatchArticle(
    @Args('fixtureId', { type: () => ID }) fixtureId: string,
    @Args('lang') lang: string,
  ): Promise<GeneratedArticle> {
    const bundle = await this.stats.fixtureBundle(fixtureId);
    const facts = this.composer.composeMatchFacts(bundle);
    return this.writer.writeMatchArticle(facts, lang);
  }
}

