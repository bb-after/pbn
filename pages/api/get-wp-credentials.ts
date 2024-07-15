import { NextApiRequest, NextApiResponse } from "next";
import mysql, { RowDataPacket } from "mysql2/promise";

// Database connection setup
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { siteId } = req.query;

  // Create a connection to the database
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Query the database for the credentials
    const [rows]: [RowDataPacket[], any] = await connection.execute(
      'SELECT domain, login, hosting_site FROM superstar_sites WHERE id = ?',
      [siteId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }

    const { domain, login, hosting_site } = rows[0];

    res.status(200).json({ domain, login, hosting_site });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    res.status(500).json({ error: "Error fetching credentials" });
  } finally {
    await connection.end();
  }
}
