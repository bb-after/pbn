const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function checkScheduleData() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🔍 Checking scheduled analysis data...');

    const [rows] = await connection.execute(
      'SELECT id, selected_engine_ids FROM geo_scheduled_analyses LIMIT 5'
    );

    console.log(`Found ${rows.length} scheduled analyses:`);

    for (const row of rows) {
      console.log(`\nSchedule ID: ${row.id}`);
      // Convert to string if needed
      const engineIdsString = String(row.selected_engine_ids);

      console.log(`Raw selected_engine_ids: "${engineIdsString}"`);
      console.log(`Type: ${typeof row.selected_engine_ids}`);
      console.log(`Is Buffer: ${Buffer.isBuffer(row.selected_engine_ids)}`);
      console.log(`String value: "${engineIdsString}"`);

      // Test the same logic as our fixed code
      let parsedEngineIds;
      try {
        // Try to parse as JSON first
        try {
          parsedEngineIds = JSON.parse(engineIdsString);
          console.log('✅ JSON parsing successful:', parsedEngineIds);
        } catch {
          // If that fails, try to clean up the string and parse again
          try {
            const cleanedString = engineIdsString
              .replace(/\s/g, '') // Remove all spaces
              .replace(/^\[/, '[') // Ensure proper array format
              .replace(/\]$/, ']');
            parsedEngineIds = JSON.parse(cleanedString);
            console.log('✅ Cleaned JSON parsing successful:', parsedEngineIds);
          } catch {
            // If cleaning doesn't work, try extracting numbers with regex
            const matches = engineIdsString.match(/\d+/g);
            parsedEngineIds = matches ? matches.map(Number) : [];
            console.log('🔧 Regex extraction result (FINAL):', parsedEngineIds);
          }
        }
      } catch (error) {
        console.log('❌ All parsing failed:', error.message);
        parsedEngineIds = [];
      }

      console.log('🎯 FINAL RESULT:', parsedEngineIds);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkScheduleData();
