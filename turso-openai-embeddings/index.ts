import { createClient } from "@libsql/client";
import OpenAI from "openai";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_DATABASE_AUTH_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function createEmbeddings(
  input: string | Array<string> | Array<number> | Array<Array<number>>,
) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input,
  });

  return response.data.map((item) => item.embedding);
}

const batchSize = 50;

async function storeEmbeddings(embeddings: number[][]) {
  for (let i = 0; i < embeddings.length; i += batchSize) {
    const batch = embeddings.slice(i, i + batchSize).map((embedding) => ({
      sql: `INSERT INTO mytable (embedding) VALUES (?)`,
      args: [new Float32Array(embedding).buffer as ArrayBuffer],
    }));

    try {
      await db.batch(batch);
      console.log(`Stored embeddings ${i + 1} to ${i + batch.length}`);
    } catch (error) {
      console.error(
        `Error storing batch ${i + 1} to ${i + batch.length}:`,
        error,
      );
    }
  }
}

async function main() {
  const embeddings = await createEmbeddings([
    "The quick brown fox jumps over the lazy dog.",
  ]);

  await storeEmbeddings(embeddings);
}

main();
