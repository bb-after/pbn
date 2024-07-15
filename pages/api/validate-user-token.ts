import { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

// Database connection setup
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  // Create a connection to the database
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Query the database for the user token
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE user_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ valid: false });
    }

    res.status(200).json({ valid: true });
  } catch (error) {
    console.error("Error validating user token:", error);
    res.status(500).json({ valid: false });
  } finally {
    await connection.end();
  }
}
