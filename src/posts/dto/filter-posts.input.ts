// src/posts/dto/filter-posts.input.ts
import { Field, InputType } from '@nestjs/graphql';
import { SortOrder } from 'src/common/enums/sort-order.enum';

@InputType()
export class FilterPostsInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  authorName?: string;

  @Field(() => SortOrder, { nullable: true })
  sortByTitle?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  sortByLikes?: SortOrder;

  @Field({ nullable: true })
  containsText?: string;

  @Field(() => SortOrder, { nullable: true })
  sortByCreatedAt?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  sortByViews?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  sortByRelevance?: SortOrder;
}
