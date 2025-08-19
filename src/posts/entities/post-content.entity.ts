import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Post } from './post.entity';
import { LanguageCode } from 'src/common/enums/language-code.enum';

@ObjectType()
@Entity()
@Index(['post', 'language'], { unique: true })
export class PostContent {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Post, (post) => post.contents, { onDelete: 'CASCADE' })
  post: Post;

  @Field(() => LanguageCode)
  @Column({ type: 'enum', enum: LanguageCode })
  language: LanguageCode;

  @Field()
  @Column({ type: 'text' })
  title: string;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field(() => [String])
  @Column('text', { array: true, default: [] })
  tags: string[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
