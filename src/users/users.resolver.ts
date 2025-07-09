import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './user-entities/user.entity';
import { CreateUserInput } from './user-dto/create-user.input';
import { UpdateUserInput } from './user-dto/update-user.input';
import { UserFilterInput } from './user-dto/user-filter.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => User)
  createUser(@Args('input') input: CreateUserInput) {
    return this.usersService.create(input);
  }
  @Mutation(() => User)
  updateUser(@Args('input') input: UpdateUserInput) {
    return this.usersService.update(input.id, input);
  }

  @Mutation(() => Boolean)
  deleteUser(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.remove(id);
  }

  @Query(() => [User])
    users(@Args('filter', { nullable: true }) filter?: UserFilterInput): Promise<User[]> {
     return this.usersService.findAll(filter);
}

  @Query(() => User)
  user(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.findOne(id);
  }
  
  
  
}
