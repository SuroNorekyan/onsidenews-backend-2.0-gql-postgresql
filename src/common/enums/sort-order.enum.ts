// src/common/enums/sort-order.enum.ts
import { registerEnumType } from '@nestjs/graphql';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortOrder, {
  name: 'SortOrder', // 👈 must match the name used in your .graphql queries
  description: 'Ascending or Descending order',
});
