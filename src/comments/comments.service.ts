//comments.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { User } from '../users/user-entities/user.entity';
import { Post } from '../posts/entities/post.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async create(input: CreateCommentInput): Promise<Comment> {
    const user = await this.userRepository.findOneBy({ userId: input.userId });
    const post = await this.postRepository.findOneBy({ postId: input.postId });
    if (!user) throw new Error(`User with ID ${input.userId} not found`);
    if (!post) throw new Error(`Post with ID ${input.postId} not found`);

    const comment = this.commentRepository.create({
      text: input.text,
      user,
      post,
    });

    return this.commentRepository.save(comment);
  }

  async findByPost(postId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { post: { postId: postId } },
      relations: ['user'],
    });
  }

  async findByUser(userId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { user: { userId: userId } },
      relations: ['post'],
    });
  }
}
