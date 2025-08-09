// src/posts/dto/top-posts-pagination.args.ts
import { ArgsType, Field, Int } from '@nestjs/graphql';
import { SortOrder } from 'src/common/enums/sort-order.enum';

@ArgsType()
export class TopPostsPaginationArgs {
  @Field(() => Int, { defaultValue: 1 })
  page: number = 1;

  @Field(() => Int, { defaultValue: 12 })
  pageSize: number = 12;

  @Field(() => SortOrder, { nullable: true, description: 'Sort by createdAt' })
  sortByCreatedAt?: SortOrder;

  @Field(() => SortOrder, { nullable: true, description: 'Sort by viewsCount' })
  sortByViews?: SortOrder;
}

