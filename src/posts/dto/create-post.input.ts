//src/posts/dto/create-post.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { PostContentInput } from './post-content.input';
import { LanguageCode } from 'src/common/enums/language-code.enum';

@InputType()
export class CreatePostInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  // 🔹 NEW
  @Field({ defaultValue: false })
  isTop?: boolean;

  // Multilanguage support (optional). If provided, content will be resolved
  // from these multilingual entries with fallback.
  @Field(() => [PostContentInput], { nullable: true })
  contents?: PostContentInput[] | null;

  @Field(() => LanguageCode, { nullable: true })
  baseLanguage?: LanguageCode | null;
}
