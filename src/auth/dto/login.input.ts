import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class LoginInput {
  @Field()
  username: string;

  @Field()
  password: string;

  @Field({ nullable: true })
  twoFactorCode?: string;
}

