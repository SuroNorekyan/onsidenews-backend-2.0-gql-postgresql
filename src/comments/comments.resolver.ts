import { Resolver, Mutation, Args, Query, Int } from '@nestjs/graphql';
import { CommentsService } from './comments.service';
import { CreateCommentInput } from './dto/create-comment.input';
import { Comment } from './entities/comment.entity';

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(private readonly commentsService: CommentsService) {}

  @Mutation(() => Comment)
  createComment(@Args('input') input: CreateCommentInput) {
    return this.commentsService.create(input);
  }

  @Query(() => [Comment])
  async commentsByPost(@Args('postId', { type: () => Int }) postId: number) {
    return this.commentsService.findByPost(postId);
  }

  @Query(() => [Comment])
  async commentsByUser(@Args('userId', { type: () => Int }) userId: number) {
    return this.commentsService.findByUser(userId);
  }
}
