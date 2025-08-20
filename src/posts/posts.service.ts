// src/posts/post.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
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
        throw new Error(
          'title and content are required when contents[] is not provided',
        );
      }
      // legacy path: translate incoming tags
      if (!tags || !Array.isArray(tags)) {
        throw new Error('tags are required when contents[] is not provided');
      }
      const allTags = new Set<string>();
      for (const tag of tags) {
        const translated =
          await this.translationService.translateToAllLanguages(tag);
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
      const chosen =
        contents.find((c) => c.language === baseLang) || contents[0];
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

      const langToUse =
        baseLanguage ?? post.baseLanguage ?? contents[0].language;
      const chosen =
        contents.find((c) => c.language === langToUse) || contents[0];
      const updatedLegacy: Partial<Post> = {};
      if (typeof chosen.title === 'string') updatedLegacy.title = chosen.title;
      if (typeof chosen.content === 'string')
        updatedLegacy.content = chosen.content;
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
    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('post.contents', 'c'); // search multilingual content

    if (filter.isTop !== undefined) {
      qb.andWhere('post.isTop = :isTop', { isTop: filter.isTop });
    }

    if (filter.containsText) {
      const raw = filter.containsText.trim();
      if (raw) {
        // Preselect IDs via robust plain ILIKE across post + post_content
        let variants: string[] = [];
        try {
          variants = await this.translationService.translateToAllLanguages(raw);
        } catch {}
        const allBasic = Array.from(new Set([raw, ...variants]));
        const patsBasic = allBasic.map((v) => `%${v}%`);
        const clausesBasic: string[] = [];
        const paramsBasic: string[] = [];
        allBasic.forEach((_v, i) => {
          const ph = `$${i + 1}`;
          paramsBasic.push(patsBasic[i]);
          clausesBasic.push(
            `(
             p.title ILIKE ${ph} OR p.content ILIKE ${ph} OR
             c.title ILIKE ${ph} OR c.content ILIKE ${ph} OR
             EXISTS (SELECT 1 FROM unnest(p.tags) AS t WHERE t ILIKE ${ph}) OR
             EXISTS (SELECT 1 FROM unnest(c.tags) AS tc WHERE tc ILIKE ${ph})
            )`,
          );
        });
        const idRowsBasic: Array<{ postid: number; createdat: string }> =
          await this.postRepository.query(
            `SELECT DISTINCT p."postId" as postid, p."createdAt" as createdat
             FROM post p LEFT JOIN post_content c ON c."postPostId" = p."postId"
             WHERE ${clausesBasic.join(' OR ')}
             ORDER BY p."createdAt" DESC`,
            paramsBasic,
          );
        if (idRowsBasic.length === 0) return [];
        const idsBasic = idRowsBasic.map((r) => r.postid);
        const preselected = await this.postRepository.find({
          where: idsBasic.map((id) => ({ postId: id })),
          order: { createdAt: 'DESC' },
          relations: ['user', 'comments', 'contents'],
        });
        return preselected;
        const all = Array.from(new Set([raw, ...variants])).map((v) =>
          v.toLowerCase(),
        );
        const patterns = all.map((v) => `%${v}%`);
        const patternParamMap: Record<string, string> = {};
        const patternParamNames = patterns.map((p, i) => {
          const key = `pat${i}`;
          patternParamMap[key] = p;
          return `:${key}`;
        });

        const tsVariants = all.filter(Boolean);

        // Optional: Relevance score
        // Optional rank using the first variant only (keeps SQL compact)
        if (tsVariants.length > 0) {
          qb.addSelect(
            `
          COALESCE(ts_rank(to_tsvector('simple', coalesce(post.title,'') || ' ' || coalesce(post.content,'')), plainto_tsquery('simple', :tsv0)), 0)
          + COALESCE(ts_rank(to_tsvector('simple', coalesce(c.title,'') || ' ' || coalesce(c.content,'')), plainto_tsquery('simple', :tsv0)), 0)
          + COALESCE(ts_rank(to_tsvector('simple', array_to_string(coalesce(post.tags, '{}'), ' ')), plainto_tsquery('simple', :tsv0)), 0)
          + COALESCE(ts_rank(to_tsvector('simple', array_to_string(coalesce(c.tags, '{}'), ' ')), plainto_tsquery('simple', :tsv0)), 0)
          `,
            'rank',
          );
        }

        qb.andWhere(
          new Brackets((w) => {
            // ILIKE paths for multilingual text
            const orFor = (expr: string) =>
              patternParamNames.map((n) => `${expr} ILIKE ${n}`).join(' OR ');

            w.where(
              `(${orFor('post.title')} OR ${orFor('post.content')} OR ${orFor(
                'c.title',
              )} OR ${orFor('c.content')})`,
            );

            // Tags (ILIKE)
            const tagMatch = (alias: string) =>
              patternParamNames.map((n) => `${alias} ILIKE ${n}`).join(' OR ');
            w.orWhere(
              `EXISTS (SELECT 1 FROM unnest(post.tags) AS tag WHERE ${tagMatch(
                'tag',
              )}) OR EXISTS (SELECT 1 FROM unnest(c.tags) AS tagc WHERE ${tagMatch(
                'tagc',
              )})`,
            );

            // Full-text
            if (tsVariants.length > 0) {
              const makeTsOr = (expr: string) =>
                tsVariants
                  .map((_, i) => `${expr} @@ plainto_tsquery('simple', :tsv${i})`)
                  .join(' OR ');
              w.orWhere(
                `(${makeTsOr(
                  `to_tsvector('simple', coalesce(post.title,'') || ' ' || coalesce(post.content,''))`,
                )} OR ${makeTsOr(
                  `to_tsvector('simple', coalesce(c.title,'') || ' ' || coalesce(c.content,''))`,
                )} OR ${makeTsOr(
                  `to_tsvector('simple', array_to_string(coalesce(post.tags, '{}'), ' '))`,
                )} OR ${makeTsOr(
                  `to_tsvector('simple', array_to_string(coalesce(c.tags, '{}'), ' '))`,
                )})`,
              );
            }

            // Trigram fuzzy
            w.orWhere(`
            similarity(public.f_unaccent(lower(post.title)), :qbase) > 0.3
            OR similarity(public.f_unaccent(lower(post.content)), :qbase) > 0.3
            OR similarity(public.f_unaccent(lower(c.title)), :qbase) > 0.3
            OR similarity(public.f_unaccent(lower(c.content)), :qbase) > 0.3
          `);
          }),
        );

        const tsParams: Record<string, string> = {};
        tsVariants.forEach((val, i) => (tsParams[`tsv${i}`] = val));
        qb.setParameters({
          ...patternParamMap,
          ...tsParams,
          qbase: raw.toLowerCase(),
        });

        if (filter.sortByRelevance) {
          qb.addOrderBy('rank', filter.sortByRelevance);
        }
      }
    }

    if (filter.title) {
      qb.andWhere(
        `public.f_unaccent(lower(post.title)) ILIKE public.f_unaccent(lower(:title))`,
        {
          title: `%${filter.title}%`,
        },
      );
    }

    if (filter.authorName) {
      qb.andWhere(
        `public.f_unaccent(lower(user.name)) ILIKE public.f_unaccent(lower(:name))`,
        {
          name: `%${filter.authorName}%`,
        },
      );
    }

    if (filter.sortByCreatedAt)
      qb.addOrderBy('post.createdAt', filter.sortByCreatedAt);
    if (filter.sortByViews)
      qb.addOrderBy('post.viewsCount', filter.sortByViews);
    if (filter.sortByTitle) qb.addOrderBy('post.title', filter.sortByTitle);

    if (filter.sortByLikes) {
      qb.loadRelationCountAndMap('post.likeCount', 'post.likedBy');
      qb.addOrderBy('post.likeCount', filter.sortByLikes);
    }

    if (!filter.sortByRelevance && !filter.sortByCreatedAt) {
      qb.addOrderBy('post.createdAt', 'DESC');
    }

    return qb.getMany();
  }

  async getDidYouMeanSuggestion(query: string): Promise<string | null> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;

    // Exact token exists? (post + post_content, tags + title words)
    const exists = await this.postRepository.query(
      `
    WITH words AS (
      SELECT unnest(tags) AS word FROM post
      UNION ALL
      SELECT regexp_split_to_table(title, E'\\s+') AS word FROM post
      UNION ALL
      SELECT unnest(tags) AS word FROM post_content
      UNION ALL
      SELECT regexp_split_to_table(title, E'\\s+') AS word FROM post_content
    )
    SELECT 1
    FROM words
    WHERE public.f_unaccent(lower(word)) = public.f_unaccent(lower($1))
    LIMIT 1;
    `,
      [trimmed],
    );
    if (exists.length > 0) return null;

    // Cache
    const cached = await this.postRepository.query(
      `SELECT suggestion FROM search_corrections WHERE query = $1 LIMIT 1`,
      [trimmed],
    );
    if (cached.length > 0) return cached[0].suggestion;

    // Fuzzy suggestion
    const result = await this.postRepository.query(
      `
    WITH words AS (
      SELECT DISTINCT public.f_unaccent(lower(unnest(tags))) AS word FROM post
      UNION
      SELECT DISTINCT public.f_unaccent(lower(regexp_split_to_table(title, E'\\s+'))) AS word FROM post
      UNION
      SELECT DISTINCT public.f_unaccent(lower(unnest(tags))) AS word FROM post_content
      UNION
      SELECT DISTINCT public.f_unaccent(lower(regexp_split_to_table(title, E'\\s+'))) AS word FROM post_content
    )
    SELECT word
    FROM words
    WHERE similarity(word, public.f_unaccent(lower($1))) > 0.4
    ORDER BY similarity(word, public.f_unaccent(lower($1))) DESC
    LIMIT 1;
    `,
      [trimmed],
    );

    if (result?.length > 0) {
      const suggestion = result[0].word;
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
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const offset = (safePage - 1) * safePageSize;

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('post.contents', 'contents') // keep contents loaded
      .orderBy('post.createdAt', 'DESC')
      .offset(offset)
      .limit(safePageSize);

    // EITHER: don’t call select() at all (let TypeORM select entity + joined relations)
    // OR: if you want explicit select, INCLUDE contents:
    qb.select(['post', 'user', 'comments', 'contents']);

    // Running this ONCE is enough
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
      relations: ['user', 'comments', 'contents'],
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
      .leftJoinAndSelect('post.contents', 'contents') // keep contents loaded
      .where('post.isTop = :isTop', { isTop: true })
      .offset(offset)
      .limit(safePageSize);

    if (!sortByCreatedAt && !sortByViews) {
      qb.orderBy('post.createdAt', 'DESC');
    } else {
      if (sortByCreatedAt) qb.addOrderBy('post.createdAt', sortByCreatedAt);
      if (sortByViews) qb.addOrderBy('post.viewsCount', sortByViews);
    }

    // Include contents here too (don’t drop it)
    qb.select(['post', 'user', 'comments', 'contents']);
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
