import { NextApiRequest, NextApiResponse } from "next";
import mysql, { ResultSetHeader } from "mysql2/promise";

// Database connection setup
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { domain, wpUsername,  topics, wpPassword, wpAppPassword } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required are required" });
  }

  const connection = await mysql.createConnection(dbConfig);

  try {
    // Check if the domain already exists
    const [existingDomains]: [any[], any] = await connection.execute(
      'SELECT COUNT(*) as count FROM superstar_sites WHERE domain = ?',
      [domain]
    );

    if (existingDomains[0].count > 0) {
      return res.status(400).json({ error: "Domain already exists" });
    }

    const [result]: [ResultSetHeader, any] = await connection.execute(
        'INSERT INTO superstar_sites (domain, login, hosting_site, password) VALUES (?, ?, ?, ?)',
        [domain, wpUsername, wpPassword, wpAppPassword]
      );
      
    // Insert new topics
    for (const topic of topics) {
        await connection.query('INSERT INTO superstar_site_topics (superstar_site_id, topic) VALUES (?, ?)', [result.insertId, topic]);
    }
        
      res.status(201).json({ message: "Superstar site created successfully", siteId: result.insertId });
    } catch (error) {
    console.error("Error creating superstar site:", error);
    res.status(500).json({ error: "Error creating superstar site" });
  } finally {
    await connection.end();
  }
}
