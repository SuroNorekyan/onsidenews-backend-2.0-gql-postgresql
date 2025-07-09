import { InputType, Field } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

@InputType()
export class CreateUserInput {
  @Field()
  username: string;

  @Field()
  email: string;

  @Field()
  password: string;

  @IsEnum(UserRole, { message: 'Role must be either admin or default' })
  @Field(() => UserRole, { defaultValue: UserRole.DEFAULT })
  role: UserRole;

  @Field()
  dateOfBirth: string;

  @Field({ nullable: true })
  profilePictureUrl?: string;
}
