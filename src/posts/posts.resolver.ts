// src/posts/post.resolver.ts
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
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
import { LanguageCode } from 'src/common/enums/language-code.enum';
import { PostContent } from './entities/post-content.entity';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  private resolvePreferredLanguage(ctx: any): LanguageCode[] {
    const header = ctx?.req?.headers?.['accept-language'] as string | undefined;
    const order: LanguageCode[] = [];
    const explicit = ctx?.req?.gqlPreferredLanguage as LanguageCode | undefined;
    if (explicit) order.push(explicit);
    if (header) {
      const preferred = header
        .split(',')
        .map((h) => h.trim().split(';')[0])
        .map((c) => c.toLowerCase());
      for (const p of preferred) {
        if (p.startsWith('en')) order.push(LanguageCode.EN);
        else if (p.startsWith('ru')) order.push(LanguageCode.RU);
        else if (p.startsWith('hy') || p.startsWith('am'))
          order.push(LanguageCode.HY);
      }
    }
    // Ensure unique order
    return Array.from(new Set(order));
  }

  private pickContent(
    post: Post,
    ctx: any,
  ): {
    language?: LanguageCode;
    title?: string;
    content?: string;
    tags?: string[];
    id?: number;
  } {
    const available = (post.contents || []) as PostContent[];
    const preferred = this.resolvePreferredLanguage(ctx);
    const base = post.baseLanguage ? [post.baseLanguage] : [];
    const fallback: LanguageCode[] = [
      LanguageCode.EN,
      LanguageCode.RU,
      LanguageCode.HY,
    ];
    const order: LanguageCode[] = Array.from(
      new Set([...preferred, ...base, ...fallback]),
    );

    for (const lang of order) {
      const found = available.find((c) => c.language === lang);
      if (found)
        return {
          language: lang,
          title: found.title,
          content: found.content,
          tags: found.tags,
          id: (found as any).id,
        };
    }

    // legacy path: no multilingual content
    return {
      language: post.baseLanguage ?? undefined,
      title: (post as any).title,
      content: (post as any).content,
      tags: (post as any).tags,
    };
  }

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
  posts(
    @Args('language', { type: () => LanguageCode, nullable: true })
    language?: LanguageCode,
    @Context() ctx?: any,
  ): Promise<Post[]> {
    if (ctx && language) ctx.req.gqlPreferredLanguage = language;
    return this.postsService.findAll();
  }

  @Query(() => Post)
  async post(
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => LanguageCode, nullable: true })
    language: LanguageCode | null,
    @Context()
    ctx: { req?: { ip?: string; gqlPreferredLanguage?: LanguageCode } },
  ): Promise<Post | null> {
    const ip = ctx.req?.ip || 'unknown';
    if (language) ctx.req!.gqlPreferredLanguage = language;
    await this.postsService.registerView(id, ip);
    return this.postsService.findOne(id);
  }

  @Query(() => PostsPage)
  postsPaginated(@Args() args: PostsPaginationArgs): Promise<PostsPage> {
    return this.postsService.getPostsPaginated(
      args.page,
      args.pageSize,
      args.sortByCreatedAt,
      args.sortByViews,
    );
  }

  @Query(() => PostsPage)
  postsInLangPaginated(
    @Args() args: PostsPaginationArgs,
    @Args('language', { type: () => LanguageCode, nullable: true })
    language?: LanguageCode,
    @Context() ctx?: any,
  ): Promise<PostsPage> {
    if (ctx && language) ctx.req.gqlPreferredLanguage = language;
    return this.postsService.getPostsPaginated(
      args.page,
      args.pageSize,
      args.sortByCreatedAt,
      args.sortByViews,
    );
  }

  @Query(() => [Post])
  async searchPosts(
    @Args('filter', { nullable: true }) filter?: FilterPostsInput,
    @Args('language', { type: () => LanguageCode, nullable: true })
    language?: LanguageCode,
    @Context() ctx?: any,
  ): Promise<Post[]> {
    if (ctx && language) ctx.req.gqlPreferredLanguage = language;
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
    @Args('language', { type: () => LanguageCode, nullable: true }) // 👈 add this
    language?: LanguageCode,
    @Context() ctx?: any, // 👈 add this
  ): Promise<Post[]> {
    if (ctx && language) ctx.req.gqlPreferredLanguage = language; // 👈 important
    return this.postsService.getTopPosts(
      limit,
      sortByCreatedAt ?? SortOrder.DESC,
    );
  }

  // 🔹 paginated list for the Top Posts page
  @Query(() => PostsPage)
  async topPostsInLangPaginated(
    @Args() args: TopPostsPaginationArgs,
    @Args('language', { type: () => LanguageCode, nullable: true })
    language?: LanguageCode,
    @Context() ctx?: any,
  ): Promise<PostsPage> {
    if (ctx && language) ctx.req.gqlPreferredLanguage = language;
    return this.postsService.getTopPostsPaginated(
      args.page,
      args.pageSize,
      args.sortByCreatedAt,
      args.sortByViews,
    );
  }

  @ResolveField(() => LanguageCode, { name: 'servedLanguage', nullable: true })
  servedLanguage(
    @Parent() post: Post,
    @Context() ctx: any,
  ): LanguageCode | null {
    const { language } = this.pickContent(post, ctx);
    return language ?? post.baseLanguage ?? LanguageCode.EN;
  }

  @ResolveField(() => PostContent, { name: 'contentResolved' })
  contentResolved(@Parent() post: Post, @Context() ctx: any) {
    const resolved = this.pickContent(post, ctx);

    const language: LanguageCode =
      resolved.language ?? post.baseLanguage ?? LanguageCode.EN;

    return {
      id: resolved.id ?? 0,
      language,
      title: resolved.title ?? (post as any).title,
      content: resolved.content ?? (post as any).content,
      tags: resolved.tags ?? (post as any).tags ?? [],
    };
  }

  @ResolveField(() => String, { name: 'content' })
  content(@Parent() post: Post, @Context() ctx: any): string {
    const resolved = this.pickContent(post, ctx);
    return resolved.content ?? (post as any).content;
  }

  @ResolveField(() => String, { name: 'title' })
  title(@Parent() post: Post, @Context() ctx: any): string {
    const resolved = this.pickContent(post, ctx);
    return resolved.title ?? (post as any).title;
  }

  @ResolveField(() => [String], { name: 'tags' })
  tags(@Parent() post: Post, @Context() ctx: any): string[] {
    const resolved = this.pickContent(post, ctx);
    return resolved.tags ?? (post as any).tags ?? [];
  }
}

