// src/posts/dto/update-post.input.ts
import { Field, InputType } from '@nestjs/graphql';
import { UpsertPostContentInput } from './upsert-post-content.input';
import { LanguageCode } from 'src/common/enums/language-code.enum';

@InputType()
@InputType()
export class UpdatePostInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  isTop?: boolean;

  @Field(() => LanguageCode, { nullable: true })
  baseLanguage?: LanguageCode | null;

  @Field(() => [UpsertPostContentInput], { nullable: true })
  contents?: UpsertPostContentInput[] | null;
}
