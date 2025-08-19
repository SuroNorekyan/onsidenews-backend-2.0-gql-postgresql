//src/posts/entities/post.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  ManyToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/user-entities/user.entity';
import { Translated } from '../dto/translated.type';
import { JoinTable } from 'typeorm';
import { Comment } from 'src/comments/entities/comment.entity';
import { PostContent } from './post-content.entity';
import { LanguageCode } from 'src/common/enums/language-code.enum';

@ObjectType()
@Entity()
export class Post {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  postId: number;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  imageUrl?: string;

  @Field(() => [String])
  @Column('text', { array: true, default: [] })
  tags: string[];

  // 🔹 NEW: mark top posts
  @Field(() => Boolean)
  @Column({ default: false })
  isTop: boolean;

  @Field(() => Translated, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  translated?: Translated;

  @Field()
  @Column()
  authorId: number;

  // Optional default/base language to prefer for this post when resolving content
  @Field(() => LanguageCode, { nullable: true })
  @Column({ type: 'enum', enum: LanguageCode, nullable: true })
  baseLanguage?: LanguageCode | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.post, { cascade: true })
  @Field(() => [Comment], { nullable: true })
  comments: Comment[];

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @Field(() => User)
  user: User;

  @ManyToMany(() => User)
  @JoinTable()
  @Field(() => [User])
  likedBy: User[];

  @Field()
  @Column({ default: 0 })
  viewsCount: number;

  @Column({
    name: 'search_vector',
    type: 'tsvector',
    nullable: true,
    select: false,
  })
  searchVector?: string;

  @OneToMany(() => PostContent, (pc) => pc.post, { cascade: true })
  @Field(() => [PostContent], { nullable: true })
  contents?: PostContent[];
}
