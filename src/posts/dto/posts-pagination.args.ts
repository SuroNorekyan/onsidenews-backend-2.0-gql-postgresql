// src/posts/dto/posts-pagination.args.ts
import { ArgsType, Field, Int } from '@nestjs/graphql';
import { SortOrder } from 'src/common/enums/sort-order.enum';

@ArgsType()
export class PostsPaginationArgs {
  @Field(() => Int, { defaultValue: 1 })
  page!: number;

  @Field(() => Int, { defaultValue: 12 })
  pageSize!: number;

  @Field(() => SortOrder, { nullable: true })
  sortByCreatedAt?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  sortByViews?: SortOrder;
}

