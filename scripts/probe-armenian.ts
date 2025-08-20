import 'dotenv/config';
import { AppDataSource } from '../src/data-source';

async function main() {
  const ds = await AppDataSource.initialize();
  try {
    const term = 'Մանչեսթեր';
    const ilike = `%${term}%`;
    console.log('Probing with term:', term);

    const pc = await ds.query(
      'SELECT id, "postPostId" as pid, language, title FROM post_content WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY pid, language',
      [ilike],
    );
    console.log('post_content ILIKE matches:', pc);

    const p = await ds.query(
      'SELECT "postId" as pid, title FROM post WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY pid',
      [ilike],
    );
    console.log('post ILIKE matches:', p);

    const fts = await ds.query(
      `SELECT DISTINCT p."postId" as pid
       FROM post p LEFT JOIN post_content c ON c."postPostId"=p."postId"
       WHERE to_tsvector('simple', coalesce(p.title,'')||' '||coalesce(p.content,'')) @@ plainto_tsquery('simple', $1)
          OR to_tsvector('simple', coalesce(c.title,'')||' '||coalesce(c.content,'')) @@ plainto_tsquery('simple', $1)
       ORDER BY pid`,
      [term],
    );
    console.log('FTS matches:', fts);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

