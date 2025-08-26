import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderSnapshot } from '../provider-cache/entities/provider-snapshot.entity';
import { ApiFootballModule } from '../apifootball/apifootball.module';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderSnapshot]), ApiFootballModule],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}

