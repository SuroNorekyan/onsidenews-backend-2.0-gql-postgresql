// src/posts/dto/update-post.input.ts
import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { CreatePostInput } from './create-post.input';

@InputType()
export class UpdatePostInput extends PartialType(CreatePostInput) {}

