import { Injectable } from '@nestjs/common';

export interface GeneratedArticle {
  title: string;
  markdown: string;
  statsSnapshotJson: string;
}

@Injectable()
export class AiWriterService {
  writeTeamPlayerSeasonProfile(facts: any, lang: string): GeneratedArticle {
    const title = `[${lang}] ${facts.team} — ${facts.player?.name} (${facts.season})`;
    const body = [
      `# ${facts.team} ${facts.season}`,
      `- League: ${facts.league}`,
      `- Player: ${facts.player?.name} (${facts.player?.nationality || 'N/A'})`,
      `- Fixtures (played): ${facts.fixtures?.played?.total ?? 'N/A'}`,
    ].join('\n');

    return {
      title,
      markdown: body,
      statsSnapshotJson: JSON.stringify(facts.snapshot),
    };
  }

  writeMatchArticle(facts: any, lang: string): GeneratedArticle {
    const title = `[${lang}] ${facts.title}`;
    const goals = (facts.events || [])
      .filter((e: any) => e.type === 'Goal')
      .map((e: any) => `- ${e.time?.elapsed}' ${e.team?.name} — ${e.player?.name || 'Unknown'}`)
      .join('\n');

    const body = [
      `# ${facts.title}`,
      `## Goals`,
      goals || 'No goals recorded in sample.',
      `\n## Lineups`,
      `${(facts.lineups || [])
        .map((l: any) => `- ${l.team?.name} (${l.formation || 'N/A'})`)
        .join('\n')}`,
    ].join('\n');

    return {
      title,
      markdown: body,
      statsSnapshotJson: JSON.stringify(facts.snapshot),
    };
  }
}

