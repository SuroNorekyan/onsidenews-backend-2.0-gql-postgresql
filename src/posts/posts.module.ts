//src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsResolver } from './posts.resolver';
import { Post } from './entities/post.entity';
import { User } from 'src/users/user-entities/user.entity';
import { TranslationService } from 'src/common/services/translation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Post, User])],
  providers: [PostsService, PostsResolver, TranslationService],
})
export class PostsModule {}
