import { registerEnumType } from '@nestjs/graphql';

export enum LanguageCode {
  EN = 'EN',
  RU = 'RU',
  HY = 'HY',
}

registerEnumType(LanguageCode, { name: 'LanguageCode' });
