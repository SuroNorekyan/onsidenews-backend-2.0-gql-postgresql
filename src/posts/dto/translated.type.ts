// src/posts/dto/translated.type.ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Translated {
  @Field({ nullable: true })
  en?: string;

  @Field({ nullable: true })
  ru?: string;
}

