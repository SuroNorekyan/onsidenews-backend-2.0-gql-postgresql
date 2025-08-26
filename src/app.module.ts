import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';
import { CommentsModule } from './comments/comments.module';
import { AuthModule } from './auth/auth.module';
import { TranslationService } from './common/services/translation.service';
import './common/enums/sort-order.enum';
import { GraphqlFeatureModule } from './graphql/graphql.module';
import { ApiFootballModule } from './apifootball/apifootball.module';
import { StatsModule } from './stats/stats.module';
import { ContentModule } from './content/content.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: (ctx) => {
        const req = ctx.req || ctx.request;
        const res = ctx.res || ctx.response;
        if (req && typeof req.logIn !== 'function') {
          req.logIn = function () {
            return Promise.resolve();
          };
        }
        return { req, res };
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'Password123123',
      database: 'onsidenews',
      entities: [__dirname + '/**/*.entity.{ts,js}'],
      synchronize: true,
    }),
    PostsModule,
    UsersModule,
    CommentsModule,
    AuthModule,
    // New feature modules (non-breaking)
    ApiFootballModule,
    StatsModule,
    ContentModule,
    GraphqlFeatureModule,
  ],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class AppModule {}
