//src/users/user-entities/user.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Comment } from '../../comments/entities/comment.entity'; // will be added later
import { Post } from '../../posts/entities/post.entity'; // for admin post filter
import { UserRole } from '../enums/user-role.enum';

@ObjectType()
@Entity()
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  userId: number;

  @Field()
  @Column({ unique: true })
  username: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column()
  password: string;

  @Field()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.DEFAULT })
  role: UserRole;

  @Field()
  @Column()
  dateOfBirth: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  profilePictureUrl?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];
  @OneToMany(() => Post, (post) => post.user)
  @Field(() => [Post], { nullable: true })
  posts: Post[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  twoFactorSecret?: string;

  @Field()
  @Column({ default: false })
  isTwoFactorEnabled: boolean;
}
