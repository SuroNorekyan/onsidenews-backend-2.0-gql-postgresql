//src/posts/dto/create-post.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreatePostInput {
  @Field()
  title: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => [String])
  tags: string[];

  // 🔹 NEW
  @Field({ defaultValue: false })
  isTop?: boolean;
}

