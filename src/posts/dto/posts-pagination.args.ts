// src/posts/dto/posts-pagination.args.ts
import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class PostsPaginationArgs {
  @Field(() => Int, { defaultValue: 1 })
  page!: number;

  @Field(() => Int, { defaultValue: 12 })
  pageSize!: number;
}

