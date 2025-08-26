import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderSnapshot } from '../provider-cache/entities/provider-snapshot.entity';
import { ApiFootballClient } from './apifootball.client';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderSnapshot])],
  providers: [ApiFootballClient],
  exports: [ApiFootballClient, TypeOrmModule],
})
export class ApiFootballModule {}

