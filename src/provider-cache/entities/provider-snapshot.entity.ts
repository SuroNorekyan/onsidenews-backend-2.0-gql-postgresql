import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'provider_snapshot' })
export class ProviderSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  provider!: string; // e.g. 'apifootball'

  @Column({ type: 'varchar', length: 128 })
  endpoint!: string; // e.g. 'fixtures', 'players'

  @Index()
  @Column({ type: 'varchar', length: 64 })
  paramsHash!: string; // sha1 of canonicalized params

  @Column({ type: 'jsonb' })
  body!: any; // upstream JSON response

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}

