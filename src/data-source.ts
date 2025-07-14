// src/data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Post } from './posts/entities/post.entity';
import { User } from './users/user-entities/user.entity';
import { Comment } from './comments/entities/comment.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'Password123123',
  database: process.env.DB_NAME || 'onsidenews',
  entities: [Post, User, Comment],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,
  logging: true,
});

