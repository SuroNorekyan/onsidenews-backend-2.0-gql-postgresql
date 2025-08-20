import 'dotenv/config';
import { AppDataSource } from '../src/data-source';

async function main() {
  const ds = await AppDataSource.initialize();
  try {
    const cols = await ds.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='post' AND column_name='search_vector_legacy'`,
    );
    console.log('post.search_vector_legacy exists:', cols.length > 0);

    const ccols = await ds.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='post_content' AND column_name='search_vector'`,
    );
    console.log('post_content.search_vector exists:', ccols.length > 0);

    // Attempt a sample search if there is data
    const term = process.argv[2] || 'манчестер';
    const tsq = `${term.toLowerCase()}:* | ${term.toLowerCase()}:*`;
    const rows = await ds.query(
      `
      SELECT p."postId", p.title
      FROM post p
      LEFT JOIN post_content c ON c."postPostId" = p."postId"
      WHERE (
        to_tsvector('simple', coalesce(p.title,'') || ' ' || coalesce(p.content,'')) @@ to_tsquery('simple', $1)
        OR to_tsvector('simple', coalesce(c.title,'') || ' ' || coalesce(c.content,'')) @@ to_tsquery('simple', $1)
        OR to_tsvector('simple', array_to_string(coalesce(p.tags, '{}'), ' ')) @@ to_tsquery('simple', $1)
        OR to_tsvector('simple', array_to_string(coalesce(c.tags, '{}'), ' ')) @@ to_tsquery('simple', $1)
      )
      ORDER BY p."createdAt" DESC
      LIMIT 5
      `,
      [tsq],
    );
    console.log('Sample search rows:', rows);

    // Additional probes for Armenian ILIKE vs f_unaccent(lower())
    const patterns = [`%${term.toLowerCase()}%`];
    const probe = await ds.query(
      `
      SELECT DISTINCT p."postId", c.title AS ctitle
      FROM post p
      LEFT JOIN post_content c ON c."postPostId" = p."postId"
      WHERE (
        c.title ILIKE ANY($1)
        OR c.content ILIKE ANY($1)
      )
      ORDER BY p."postId"
      `,
      [patterns],
    );
    console.log('ILIKE probe rows:', probe);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
