//src/users/user-dto/update-user.input.ts
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field()
  id: number;

  @Field({ nullable: true })
  twoFactorSecret?: string;

  @Field({ nullable: true })
  isTwoFactorEnabled?: boolean;
}
