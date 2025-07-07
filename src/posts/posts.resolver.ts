// src/posts/post.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CreatePostInput } from './dto/create-post.input';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly postsService: PostsService) {}

  @Mutation(() => Post)
  createPost(@Args('input') input: CreatePostInput): Promise<Post> {
    return this.postsService.create(input);
  }

  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return this.postsService.findAll();
  }

  @Query(() => Post)
  post(@Args('id', { type: () => Int }) id: number): Promise<Post | null> {
    return this.postsService.findOne(id);
  }
}
