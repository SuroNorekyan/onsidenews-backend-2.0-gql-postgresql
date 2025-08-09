// src/posts/post.resolver.ts
import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { CreatePostInput } from './dto/create-post.input';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/guards/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdatePostInput } from './dto/update-post.input';
import { FilterPostsInput } from './dto/filter-posts.input';
import { PostsPage } from './dto/posts-page.type';
import { PostsPaginationArgs } from './dto/posts-pagination.args';
import { SortOrder } from 'src/common/enums/sort-order.enum';
import { TopPostsPaginationArgs } from './dto/top-posts-pagination.args';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Post)
  createPost(
    @Args('input') input: CreatePostInput,
    @CurrentUser() user: any,
  ): Promise<Post> {
    console.log('🟣 createPost resolver called', { user });
    const inputWithAuthor = { ...input, authorId: user?.userId };
    return this.postsService.create(inputWithAuthor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Post)
  updatePost(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdatePostInput,
  ): Promise<Post | null> {
    return this.postsService.update(id, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Mutation(() => Boolean)
  deletePost(@Args('id', { type: () => Int }) id: number): Promise<boolean> {
    return this.postsService.remove(id);
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
  async post(
    @Args('id', { type: () => Int }) id: number,
    @Context() ctx: { req?: { ip?: string } },
  ): Promise<Post | null> {
    const ip = ctx.req?.ip || 'unknown';
    await this.postsService.registerView(id, ip);
    return this.postsService.findOne(id);
  }

  @Query(() => PostsPage)
  postsPaginated(@Args() args: PostsPaginationArgs): Promise<PostsPage> {
    return this.postsService.getPostsPaginated(args.page, args.pageSize);
  }

  @Query(() => [Post])
  async searchPosts(
    @Args('filter', { nullable: true }) filter?: FilterPostsInput,
  ): Promise<Post[]> {
    return this.postsService.searchPosts(filter || {});
  }

  @Query(() => String, { nullable: true })
  async didYouMean(@Args('query') query: string): Promise<string | null> {
    return this.postsService.getDidYouMeanSuggestion(query);
  }

  @Query(() => [Post])
  async topPosts(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('sortByCreatedAt', { type: () => SortOrder, nullable: true })
    sortByCreatedAt?: SortOrder,
  ): Promise<Post[]> {
    return this.postsService.getTopPosts(
      limit,
      sortByCreatedAt ?? SortOrder.DESC,
    );
  }

  // 🔹 paginated list for the Top Posts page
  @Query(() => PostsPage)
  async topPostsPaginated(
    @Args() args: TopPostsPaginationArgs,
  ): Promise<PostsPage> {
    return this.postsService.getTopPostsPaginated(
      args.page,
      args.pageSize,
      args.sortByCreatedAt,
      args.sortByViews,
    );
  }
}
