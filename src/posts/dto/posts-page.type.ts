// src/posts/dto/posts-page.type.ts
import { Field, ObjectType, Int } from '@nestjs/graphql';
import { Post } from '../entities/post.entity';

@ObjectType()
export class PostsPage {
  @Field(() => [Post])
  items!: Post[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

