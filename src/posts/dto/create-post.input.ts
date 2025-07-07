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

  @Field({ defaultValue: false })
  isPublished: boolean;

  @Field()
  authorId: number;
}

