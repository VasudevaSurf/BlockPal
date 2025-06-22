import { MongoClient, Db } from "mongodb";

interface Connection {
  client: MongoClient;
  db: Db;
}

let cachedConnection: Connection | null = null;

export async function connectToDatabase(): Promise<Connection> {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const client = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017/BlockPal",
    );
    await client.connect();

    const db = client.db("BlockPal");

    cachedConnection = { client, db };
    return cachedConnection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error("Failed to connect to database");
  }
}
