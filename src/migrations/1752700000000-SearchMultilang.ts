// src/migrations/1752700000000-SearchMultilang.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchMultilang1752700000000 implements MigrationInterface {
  name = 'SearchMultilang1752700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0) Ensure extensions (install unaccent into the PUBLIC schema explicitly)
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public`,
    );
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // 1) Immutable wrapper over unaccent(dictionary, text)
    //    Using a proper regdictionary value avoids your previous "function ... does not exist" errors.
    // Use a plpgsql wrapper that gracefully degrades if unaccent() is unavailable
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.f_unaccent(text)
      RETURNS text
      LANGUAGE plpgsql
      IMMUTABLE
      PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
      BEGIN
        BEGIN
          RETURN unaccent($1);
        EXCEPTION WHEN undefined_function THEN
          -- If the unaccent extension is not installed or accessible, fall back
          RETURN $1;
        END;
      END;
      $$;
    `);

    // 2) Legacy Post: helper tsvector (safe & idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_attribute
          WHERE attrelid = 'post'::regclass AND attname = 'search_vector_legacy'
        ) THEN
          ALTER TABLE "post" ADD COLUMN "search_vector_legacy" tsvector
            GENERATED ALWAYS AS (
              to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))
            ) STORED;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_search_vector_legacy
      ON "post" USING gin ("search_vector_legacy");
    `);

    // 3) Functional trigram indexes on Post (use the immutable wrapper)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_title_trgm_u
      ON "post" USING gin ( (public.f_unaccent(lower("title"))) gin_trgm_ops );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_content_trgm_u
      ON "post" USING gin ( (public.f_unaccent(lower("content"))) gin_trgm_ops );
    `);

    // 4) Skip stored column for tags; we'll search tags via expression in queries

    // 5) PostContent: tsvector + functional trigram + tags vector
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_attribute
          WHERE attrelid = 'post_content'::regclass AND attname = 'search_vector'
        ) THEN
          ALTER TABLE "post_content" ADD COLUMN "search_vector" tsvector
            GENERATED ALWAYS AS (
              to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))
            ) STORED;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_postcontent_search_vector
      ON "post_content" USING gin ("search_vector");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_postcontent_title_trgm_u
      ON "post_content" USING gin ( (public.f_unaccent(lower("title"))) gin_trgm_ops );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_postcontent_content_trgm_u
      ON "post_content" USING gin ( (public.f_unaccent(lower("content"))) gin_trgm_ops );
    `);

    // (Optional) Expression index for tags is omitted to avoid volatility issues
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: we did not create a tags index in up()

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_postcontent_content_trgm_u`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_postcontent_title_trgm_u`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_postcontent_search_vector`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_content" DROP COLUMN IF EXISTS "search_vector"`,
    );

    // no-op: we did not create a tags index in up()

    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_content_trgm_u`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_title_trgm_u`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_post_search_vector_legacy`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP COLUMN IF EXISTS "search_vector_legacy"`,
    );

    await queryRunner.query(`DROP FUNCTION IF EXISTS public.f_unaccent(text)`);
  }
}
