import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostContentAndBaseLanguage1752600000000 implements MigrationInterface {
  name = 'AddPostContentAndBaseLanguage1752600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for languages if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'languagecode') THEN
          CREATE TYPE "languagecode" AS ENUM ('EN','RU','HY');
        END IF;
      END$$;
    `);

    // Add baseLanguage column to post
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'post' AND column_name = 'baseLanguage'
        ) THEN
          ALTER TABLE "post" ADD COLUMN "baseLanguage" "languagecode" NULL;
        END IF;
      END$$;
    `);

    // Default baseLanguage to EN where null (cast to the actual enum type of the column)
    await queryRunner.query(`
      DO $$
      DECLARE t regtype;
      BEGIN
        SELECT atttypid::regtype INTO t FROM pg_attribute WHERE attrelid = 'post'::regclass AND attname = 'baseLanguage';
        EXECUTE format('UPDATE "post" SET "baseLanguage" = %L::%s WHERE "baseLanguage" IS NULL', 'EN', t::text);
      END$$;
    `);

    // Create post_content table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_content" (
        "id" SERIAL PRIMARY KEY,
        "postId" integer NOT NULL,
        "language" "languagecode" NOT NULL,
        "title" text NOT NULL,
        "content" text NOT NULL,
        "tags" text[] NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_post_content_post" FOREIGN KEY ("postId") REFERENCES "post"("postId") ON DELETE CASCADE,
        CONSTRAINT "UQ_post_content_post_language" UNIQUE ("postId", "language")
      );
    `);

    // Trigger to auto-update updatedAt
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_set_updated_at ON "post_content";
      CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON "post_content"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    // Handle potential legacy lowercase column name 'postid' -> rename to "postId"
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'post_content' AND column_name = 'postid'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'post_content' AND column_name = 'postId'
        ) THEN
          ALTER TABLE "post_content" RENAME COLUMN postid TO "postId";
        END IF;
      END$$;
    `);

    // Backfill existing posts into PostContent at baseLanguage
    await queryRunner.query(`
      DO $$
      DECLARE tgt_col text; lang_t regtype;
      BEGIN
        SELECT atttypid::regtype INTO lang_t
        FROM pg_attribute
        WHERE attrelid = 'post_content'::regclass AND attname = 'language';

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'post_content' AND column_name = 'postId'
        ) THEN
          tgt_col := '"postId"';
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'post_content' AND column_name = 'postid'
        ) THEN
          tgt_col := 'postid';
        ELSE
          ALTER TABLE "post_content" ADD COLUMN "postId" integer;
          tgt_col := '"postId"';
        END IF;

        EXECUTE format(
          'INSERT INTO "post_content" (%s, "language", "title", "content", "tags")\n' ||
          'SELECT p."postId", (p."baseLanguage")::text::%s, p."title", p."content", COALESCE(p."tags", ''{}'')\n' ||
          'FROM "post" p\n' ||
          'WHERE NOT EXISTS (SELECT 1 FROM "post_content" pc WHERE pc.%s = p."postId" AND pc."language" = (p."baseLanguage")::text::%s)',
          tgt_col, lang_t::text, tgt_col, lang_t::text
        );
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_set_updated_at ON "post_content";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_content";`);
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN IF EXISTS "baseLanguage";`);
    await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'languagecode') THEN DROP TYPE "languagecode"; END IF; END$$;`);
  }
}
