// src/posts/post.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostInput } from './dto/create-post.input';
import { Post } from './entities/post.entity';
import { User } from 'src/users/user-entities/user.entity';
import { UpdatePostInput } from './dto/update-post.input';
import { TranslationService } from 'src/common/services/translation.service';
import { FilterPostsInput } from './dto/filter-posts.input';
import { SortOrder } from 'src/common/enums/sort-order.enum';
import { PostContent } from './entities/post-content.entity';
import { LanguageCode } from 'src/common/enums/language-code.enum';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(PostContent)
    private postContentRepository: Repository<PostContent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly translationService: TranslationService,
  ) {}

  viewThrottle = new Map<string, number>();

  async create(createPostInput: CreatePostInput): Promise<Post> {
    const { tags, contents, baseLanguage, ...rest } = createPostInput;

    let aggregatedTags: string[] = [];
    if (contents?.length) {
      // union of provided per-language tags
      const set = new Set<string>();
      contents.forEach((c) => c.tags.forEach((t) => set.add(t)));
      aggregatedTags = Array.from(set);
    } else {
      if (!rest.title || !rest.content) {
        throw new Error('title and content are required when contents[] is not provided');
      }
      // legacy path: translate incoming tags
      if (!tags || !Array.isArray(tags)) {
        throw new Error('tags are required when contents[] is not provided');
      }
      const allTags = new Set<string>();
      for (const tag of tags) {
        const translated = await this.translationService.translateToAllLanguages(tag);
        translated.forEach((t) => allTags.add(t));
      }
      aggregatedTags = Array.from(allTags);
    }

    const post = this.postRepository.create({
      ...rest,
      baseLanguage: baseLanguage ?? null,
      tags: aggregatedTags,
    });

    if (contents?.length) {
      const baseLang = baseLanguage ?? contents[0].language;
      const chosen = contents.find((c) => c.language === baseLang) || contents[0];
      if (chosen) {
        if (chosen.title) post.title = chosen.title;
        if (chosen.content) post.content = chosen.content;
      }
    }

    const saved = await this.postRepository.save(post);
    if (contents?.length) {
      const entities = contents.map((c) =>
        this.postContentRepository.create({
          post: saved,
          language: c.language,
          title: c.title,
          content: c.content,
          tags: c.tags,
        }),
      );
      await this.postContentRepository.save(entities);
    } else {
      // legacy path: mirror into PostContent at baseLanguage (default EN)
      const lang = baseLanguage ?? LanguageCode.EN;
      const mirror = this.postContentRepository.create({
        post: saved,
        language: lang,
        title: saved.title,
        content: saved.content,
        tags: tags,
      });
      await this.postContentRepository.save(mirror);
    }
    return saved;
  }

  async update(id: number, input: UpdatePostInput): Promise<Post | null> {
    const { contents, baseLanguage, ...rest } = input;
    await this.postRepository.update(id, rest);

    if (typeof baseLanguage !== 'undefined') {
      await this.postRepository.update(id, { baseLanguage });
    }

    if (contents && contents.length) {
      const post = await this.findOne(id);
      if (!post) return null;
      for (const c of contents) {
        const existing = await this.postContentRepository.findOne({
          where: { post: { postId: id }, language: c.language },
          relations: ['post'],
        });
        if (existing) {
          if (typeof c.title === 'string') existing.title = c.title;
          if (typeof c.content === 'string') existing.content = c.content;
          if (Array.isArray(c.tags)) existing.tags = c.tags;
          await this.postContentRepository.save(existing);
        } else {
          const created = this.postContentRepository.create({
            post,
            language: c.language,
            title: c.title ?? post.title,
            content: c.content ?? post.content,
            tags: c.tags ?? post.tags ?? [],
          });
          await this.postContentRepository.save(created);
        }
      }

      const langToUse = baseLanguage ?? post.baseLanguage ?? contents[0].language;
      const chosen = contents.find((c) => c.language === langToUse) || contents[0];
      const updatedLegacy: Partial<Post> = {};
      if (typeof chosen.title === 'string') updatedLegacy.title = chosen.title;
      if (typeof chosen.content === 'string') updatedLegacy.content = chosen.content;
      if (Array.isArray(chosen.tags)) updatedLegacy.tags = chosen.tags;
      if (Object.keys(updatedLegacy).length) {
        await this.postRepository.update(id, updatedLegacy);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<boolean> {
    await this.postRepository.delete(id);
    return true;
  }

  async findAll(): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['comments', 'user', 'contents'],
    });
  }

  async findOne(id: number): Promise<Post | null> {
    return this.postRepository.findOne({
      where: { postId: id },
      relations: ['contents'],
    });
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

    if (filter.isTop !== undefined) {
      qb.andWhere('post.isTop = :isTop', { isTop: filter.isTop });
    }

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

  async getPostsPaginated(page = 1, pageSize = 12) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100); // hard cap for safety
    const offset = (safePage - 1) * safePageSize;

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.comments', 'comments')
      .orderBy('post.createdAt', 'DESC')
      .offset(offset)
      .limit(safePageSize);

    // Ask Postgres to compute total in the same result set
    qb.select([
      'post', // selects all post columns (entity selection)
      'user',
      'comments',
    ]);
    // add raw count column
    qb.addSelect('COUNT(*) OVER() AS "fullCount"');

    const { entities: items, raw } = await qb.getRawAndEntities();
    const totalCount = Number(raw[0]?.fullCount ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));

    return {
      items,
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    };
  }

  // 🔹 quick list of top posts for sidebar (limit + sort by createdAt DESC by default)
  async getTopPosts(
    limit = 10,
    sortByCreatedAt: SortOrder = SortOrder.DESC,
  ): Promise<Post[]> {
    return this.postRepository.find({
      where: { isTop: true },
      order: { createdAt: sortByCreatedAt },
      take: limit,
      relations: ['user', 'comments'],
    });
  }

  // 🔹 paginated top posts (sort by date and/or views)
  async getTopPostsPaginated(
    page = 1,
    pageSize = 12,
    sortByCreatedAt?: SortOrder,
    sortByViews?: SortOrder,
  ) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const offset = (safePage - 1) * safePageSize;

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.comments', 'comments')
      .where('post.isTop = :isTop', { isTop: true })
      .offset(offset)
      .limit(safePageSize);

    // default primary ordering by createdAt DESC if no explicit sort is given
    if (!sortByCreatedAt && !sortByViews) {
      qb.orderBy('post.createdAt', 'DESC');
    } else {
      if (sortByCreatedAt) qb.addOrderBy('post.createdAt', sortByCreatedAt);
      if (sortByViews) qb.addOrderBy('post.viewsCount', sortByViews);
    }

    qb.select(['post', 'user', 'comments']);
    qb.addSelect('COUNT(*) OVER() AS "fullCount"');

    const { entities: items, raw } = await qb.getRawAndEntities();
    const totalCount = Number(raw[0]?.fullCount ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));

    return {
      items,
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    };
  }
}
