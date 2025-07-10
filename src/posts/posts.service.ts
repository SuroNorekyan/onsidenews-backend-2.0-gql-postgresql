// src/posts/post.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostInput } from './dto/create-post.input';
import { Post } from './entities/post.entity';
import { User } from 'src/users/user-entities/user.entity';
import { UpdatePostInput } from './dto/update-post.input';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createPostInput: CreatePostInput): Promise<Post> {
    const post = this.postRepository.create(createPostInput);
    return this.postRepository.save(post);
  }

  async update(id: number, input: UpdatePostInput): Promise<Post | null> {
    await this.postRepository.update(id, input);
    return this.findOne(id);
  }

  async remove(id: number): Promise<boolean> {
    await this.postRepository.delete(id);
    return true;
  }

  async findAll(): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['comments', 'user'],
    });
  }

  async findOne(id: number): Promise<Post | null> {
    return this.postRepository.findOneBy({ postId: id });
  }

  async likePost(postId: number, userId: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { postId: postId },
      relations: ['likedBy'],
    });
    const user = await this.userRepository.findOneBy({ userId: userId });

    if (!post || !user) throw new Error('Post or user not found');

    if (post.likedBy.some((u) => u.userId === userId)) {
      throw new Error('User already liked this post');
    }

    post.likedBy.push(user);
    return this.postRepository.save(post);
  }
}
