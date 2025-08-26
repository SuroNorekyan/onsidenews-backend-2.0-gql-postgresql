import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderSnapshot1753000000000 implements MigrationInterface {
  name = 'ProviderSnapshot1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS "provider_snapshot" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider" varchar(64) NOT NULL,
        "endpoint" varchar(128) NOT NULL,
        "paramsHash" varchar(64) NOT NULL,
        "body" jsonb NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMPTZ NOT NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_provider_snapshot_paramsHash" ON "provider_snapshot" ("paramsHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_provider_snapshot_expires_at" ON "provider_snapshot" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_provider_snapshot_paramsHash"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_provider_snapshot_expires_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_snapshot"`);
  }
}
