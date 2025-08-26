import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { ContentModule } from '../content/content.module';
import { IdsResolver } from './resolvers/ids.resolver';
import { ContentResolver } from './resolvers/content.resolver';

@Module({
  imports: [StatsModule, ContentModule],
  providers: [IdsResolver, ContentResolver],
})
export class GraphqlFeatureModule {}

