import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PlayerToday {
  @Field()
  name!: string;

  @Field()
  team!: string;

  @Field()
  league!: string;

  @Field(() => Int, { nullable: true })
  season!: number | null;

  @Field()
  summary!: string;
}

@ObjectType()
export class GeneratedArticle {
  @Field()
  title!: string;

  @Field()
  markdown!: string;

  @Field()
  statsSnapshotJson!: string;
}

