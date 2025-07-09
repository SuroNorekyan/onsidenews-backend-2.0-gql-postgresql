import { InputType, Field, Int } from '@nestjs/graphql';
import { SortOrder } from 'src/common/enums/sort-order.enum';
@InputType()
export class FilterCommentsInput {
  @Field(() => Int, { nullable: true })
  postId?: number;

  @Field({ nullable: true })
  authorName?: string;

  @Field({ nullable: true })
  containsText?: string;

  @Field({ nullable: true })
  sortBy?: 'createdAt' | 'text';

  @Field({ nullable: true })
  sortOrder?: SortOrder;
}
