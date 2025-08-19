import { Field, InputType } from '@nestjs/graphql';
import { LanguageCode } from 'src/common/enums/language-code.enum';

@InputType()
export class PostContentInput {
  @Field(() => LanguageCode)
  language!: LanguageCode;

  @Field()
  title!: string;

  @Field()
  content!: string;

  @Field(() => [String])
  tags!: string[];
}
