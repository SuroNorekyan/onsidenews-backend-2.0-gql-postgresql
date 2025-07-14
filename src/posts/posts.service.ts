// src/posts/post.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreatePostInput } from './dto/create-post.input';
import { Post } from './entities/post.entity';
import { User } from 'src/users/user-entities/user.entity';
import { UpdatePostInput } from './dto/update-post.input';
import { TranslationService } from 'src/common/services/translation.service';
import { FilterPostsInput } from './dto/filter-posts.input';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly translationService: TranslationService,
  ) {}

  viewThrottle = new Map<string, number>();

  async create(createPostInput: CreatePostInput): Promise<Post> {
    const { tags, ...rest } = createPostInput;
    const allTags = new Set<string>();

    for (const tag of tags) {
      const translated =
        await this.translationService.translateToAllLanguages(tag);
      translated.forEach((t) => allTags.add(t));
    }

    const post = this.postRepository.create({
      ...rest,
      tags: Array.from(allTags),
    });

    return this.postRepository.save(post);
  }

  async update(id: number, input: UpdatePostInput): Promise<Post | null> {
    await this.postRepository.update(id, input);
    return this.findOne(id);
  }

  async remove(id: number): Promise<boolean> {
    await this.postRepository.delete(id);
    return true;
  }

  async findAll(): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['comments', 'user'],
    });
  }

  async findOne(id: number): Promise<Post | null> {
    return this.postRepository.findOneBy({ postId: id });
  }

  async likePost(postId: number, userId: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { postId: postId },
      relations: ['likedBy'],
    });
    const user = await this.userRepository.findOneBy({ userId: userId });

    if (!post || !user) throw new Error('Post or user not found');

    if (post.likedBy.some((u) => u.userId === userId)) {
      throw new Error('User already liked this post');
    }

    post.likedBy.push(user);
    return this.postRepository.save(post);
  }

  async incrementViews(postId: number): Promise<void> {
    await this.postRepository
      .createQueryBuilder()
      .update(Post)
      .set({ viewsCount: () => '"viewsCount" + 1' }) // note the quotes!
      .where('postId = :postId', { postId })
      .execute();
  }

  async registerView(postId: number, ip: string): Promise<void> {
    const key = `${postId}:${ip}`;
    const now = Date.now();
    const last = this.viewThrottle.get(key);

    // Prevent double-count within 1 minute
    if (last && now - last < 60 * 1000) return;

    this.viewThrottle.set(key, now);
    await this.incrementViews(postId);
  }

  async searchPosts(filter: FilterPostsInput): Promise<Post[]> {
    const qb = this.postRepository.createQueryBuilder('post');

    if (filter.containsText) {
      const plainQuery = filter.containsText.trim();
      const tsQuery = plainQuery
        .split(/\s+/)
        .map((word) => `${word}:*`)
        .join(' & ');

      // 🟢 Full-text search
      qb.where(`"post"."search_vector" @@ to_tsquery('simple', :tsQuery)`, {
        tsQuery,
      });

      // 🟢 Fuzzy matching with pg_trgm (title + content)
      qb.orWhere(
        `similarity("post"."title", :plain) > 0.3 OR similarity("post"."content", :plain) > 0.3`,
        { plain: plainQuery },
      );

      // 🟢 Fuzzy matching with tags
      qb.orWhere(
        `EXISTS (
        SELECT 1 FROM unnest("post"."tags") AS tag
        WHERE similarity(tag, :plain) > 0.3
      )`,
        { plain: plainQuery },
      );

      // 🟢 Optional: relevance score
      qb.addSelect(
        `ts_rank("post"."search_vector", to_tsquery('simple', :tsQuery))`,
        'rank',
      );

      if (filter.sortByRelevance) {
        qb.orderBy('rank', filter.sortByRelevance);
      }
    }

    if (filter.sortByCreatedAt) {
      qb.addOrderBy('"post"."createdAt"', filter.sortByCreatedAt);
    }

    if (filter.sortByViews) {
      qb.addOrderBy('"post"."viewsCount"', filter.sortByViews);
    }

    if (filter.title) {
      qb.andWhere(`LOWER(post.title) ILIKE LOWER(:title)`, {
        title: `%${filter.title}%`,
      });
    }

    if (filter.authorName) {
      qb.leftJoinAndSelect('post.user', 'user');
      qb.andWhere(`LOWER(user.name) ILIKE LOWER(:name)`, {
        name: `%${filter.authorName}%`,
      });
    }

    if (filter.sortByTitle) {
      qb.addOrderBy('post.title', filter.sortByTitle);
    }

    if (filter.sortByLikes) {
      qb.loadRelationCountAndMap('post.likeCount', 'post.likedBy');
      qb.addOrderBy('post.likeCount', filter.sortByLikes);
    }

    qb.leftJoinAndSelect('post.user', 'user');
    qb.leftJoinAndSelect('post.comments', 'comments');

    return qb.getMany();
  }

  async getDidYouMeanSuggestion(query: string): Promise<string | null> {
    const trimmed = query.trim().toLowerCase();

    // ✅ 1. Early exit: if input already exists in tags/title, return null
    const exists = await this.postRepository.query(
      `
    SELECT 1 FROM (
      SELECT unnest(tags) AS word FROM post
      UNION
      SELECT regexp_split_to_table(title, E'\\s+') AS word FROM post
    ) AS words
    WHERE lower(word) = $1
    LIMIT 1;
    `,
      [trimmed],
    );
    if (exists.length > 0) return null;

    // ✅ 2. Check if we've already cached a correction
    const cached = await this.postRepository.query(
      `SELECT suggestion FROM search_corrections WHERE query = $1 LIMIT 1`,
      [trimmed],
    );
    if (cached.length > 0) return cached[0].suggestion;

    // ✅ 3. Run fuzzy match using similarity
    const result = await this.postRepository.query(
      `
    SELECT word
    FROM (
      SELECT DISTINCT unnest(tags) AS word FROM post
      UNION
      SELECT DISTINCT regexp_split_to_table(title, E'\\s+') AS word FROM post
    ) AS words
    WHERE similarity(word, $1) > 0.4
    ORDER BY similarity(word, $1) DESC
    LIMIT 1;
    `,
      [trimmed],
    );

    if (result?.length > 0) {
      const suggestion = result[0].word;

      // ✅ 4. Cache the correction
      await this.postRepository.query(
        `
      INSERT INTO search_corrections (query, suggestion)
      VALUES ($1, $2)
      ON CONFLICT (query) DO UPDATE SET suggestion = $2, updated_at = now()
      `,
        [trimmed, suggestion],
      );

      return suggestion;
    }

    return null;
  }
}
