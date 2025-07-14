//src/migrations/1752509526146-AddSearchVector.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchVector1752509526146 implements MigrationInterface {
  name = 'AddSearchVector1752509526146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ✅ Rename searchVector to search_vector if exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'post' AND column_name = 'searchVector'
        ) THEN
          ALTER TABLE post RENAME COLUMN "searchVector" TO search_vector;
        END IF;
      END;
      $$;
    `);

    // ✅ Create search_corrections table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search_corrections (
        query TEXT PRIMARY KEY,
        suggestion TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS search_corrections;`);
    await queryRunner.query(
      `ALTER TABLE "post" RENAME COLUMN search_vector TO "searchVector"`,
    );
  }
}

