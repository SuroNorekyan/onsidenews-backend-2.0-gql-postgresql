import { Field, InputType } from '@nestjs/graphql';
import { LanguageCode } from 'src/common/enums/language-code.enum';

@InputType()
export class UpsertPostContentInput {
  @Field(() => LanguageCode)
  language!: LanguageCode;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  content?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

