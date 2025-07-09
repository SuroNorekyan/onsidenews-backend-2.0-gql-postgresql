// src/posts/post.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CreatePostInput } from './dto/create-post.input';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';
import { FilterPostsInput } from './dto/filter-posts.input';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Mutation(() => Post)
  createPost(@Args('input') input: CreatePostInput): Promise<Post> {
    return this.postsService.create(input);
  }

  @Mutation(() => Post)
  likePost(
    @Args('postId', { type: () => Int }) postId: number,
    @Args('userId', { type: () => Int }) userId: number,
  ) {
    return this.postsService.likePost(postId, userId);
  }

  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return this.postsService.findAll();
  }

  @Query(() => Post)
  post(@Args('id', { type: () => Int }) id: number): Promise<Post | null> {
    return this.postsService.findOne(id);
  }

  // @Query(() => [Post])
  // async findAllPosts(
  //   @Args('filter', { nullable: true }) filter: FilterPostsInput,
  // ) {
  //   return this.postsService.findAll(filter);
  // }
}
