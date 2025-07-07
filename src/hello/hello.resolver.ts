import { Query, Resolver } from '@nestjs/graphql';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class HelloResponse {
  @Field()
  message: string;
}

@Resolver()
export class HelloResolver {
  @Query(() => HelloResponse)
  hello(): HelloResponse {
    return { message: 'Hello from OnsideNews backend 🎉' };
  }
}
