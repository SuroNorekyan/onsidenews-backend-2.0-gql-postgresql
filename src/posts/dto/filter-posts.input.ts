// src/posts/dto/filter-posts.input.ts
import { Field, InputType } from '@nestjs/graphql';
import { SortOrder } from 'src/common/enums/sort-order.enum';

@InputType()
export class FilterPostsInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  containsText?: string;

  @Field({ nullable: true })
  authorName?: string;

  // Sorting flags
  @Field(()=> SortOrder, { nullable: true })
  sortByCreatedAt?: SortOrder;

  @Field(()=> SortOrder, { nullable: true })
  sortByTitle?: SortOrder;

  @Field(()=> SortOrder, { nullable: true })
  sortByLikes?: SortOrder;
}
