import { Module } from '@nestjs/common';
import { PostComposerService } from './post-composer.service';
import { AiWriterService } from './ai-writer.service';

@Module({
  providers: [PostComposerService, AiWriterService],
  exports: [PostComposerService, AiWriterService],
})
export class ContentModule {}

