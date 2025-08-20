import { MigrationInterface, QueryRunner } from 'typeorm';

export class TypeormMetadataFix1752800000000 implements MigrationInterface {
  name = 'TypeormMetadataFix1752800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the typeorm_metadata table if it's missing. Some TypeORM flows
    // (e.g., synchronize with generated columns) read from this table early.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'typeorm_metadata'
        ) THEN
          CREATE TABLE "typeorm_metadata" (
            "type" varchar NOT NULL,
            "database" varchar,
            "schema" varchar,
            "table" varchar,
            "name" varchar,
            "value" text
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Safe no-op: do not drop metadata table automatically
  }
}

