// src/users/user-dto/user-filter.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { SortOrder } from 'src/common/enums/sort-order.enum';
import { UserRole } from '../enums/user-role.enum';

@InputType()
export class UserFilterInput {
  @Field({ nullable: true }) role?: UserRole;
  @Field({ nullable: true }) username?: string;

  @Field(() => SortOrder, { nullable: true }) sortByUsername?: SortOrder;
  @Field(() => SortOrder, { nullable: true }) sortByDateOfBirth?: SortOrder;
  @Field(() => SortOrder, { nullable: true }) sortByCreatedAt?: SortOrder;
}
