import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Translated } from '../dto/translated.type';

@ObjectType()
@Entity()
export class Post {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

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

  @Field(() => Boolean)
  @Column({ default: false })
  isPublished: boolean;

  @Field(() => Translated, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  translated?: Translated;

  @Field()
  @Column()
  authorId: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

