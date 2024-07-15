import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as querystring from "querystring";
import mysql from "mysql2/promise";

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
      const [rows] = await connection.execute(
        'SELECT domain, login, hosting_site FROM superstar_sites WHERE id = ?',
        [siteId]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ error: "Site not found" });
      }
  
      const { domain, login, hosting_site } = rows[0];
  
      const loginUrl = `${domain}/wp-login.php`;
      const data = querystring.stringify({
        log: login,
        pwd: hosting_site,
        rememberme: "forever",
      });
  
      // Perform login and handle cookies
      const response = await axios.post(loginUrl, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });
  
      // Extract cookies from the response
      const cookies = response.headers["set-cookie"];
  
      if (!cookies) {
        throw new Error("Login failed, no cookies set");
      }
  
      // Construct the redirect URL
      const redirectUrl = `${domain}/wp-admin`;
  
      res.status(200).json({ redirectUrl, cookies });
    } catch (error) {
      console.error("Error logging into WordPress:", error);
      res.status(500).json({ error: "Error logging into WordPress" });
    } finally {
      await connection.end();
    }
  }
  