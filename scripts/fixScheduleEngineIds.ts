const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

import mysql from 'mysql2/promise';

async function fixScheduleEngineIds() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🔧 Fixing malformed selected_engine_ids in scheduled analyses...');

    // Get all schedules
    const [rows] = (await connection.execute(
      'SELECT id, selected_engine_ids FROM geo_scheduled_analyses'
    )) as any[];

    console.log(`Found ${rows.length} scheduled analyses to check`);

    let fixed = 0;

    for (const row of rows) {
      try {
        // Try to parse the current value
        JSON.parse(row.selected_engine_ids);
        console.log(`✅ Schedule ${row.id}: Already valid JSON`);
      } catch (error) {
        console.log(`🔧 Schedule ${row.id}: Fixing malformed JSON - "${row.selected_engine_ids}"`);

        let fixedValue;

        try {
          // Try cleaning approach
          const cleanedString = row.selected_engine_ids
            .replace(/\s/g, '') // Remove all spaces
            .replace(/^\[/, '[') // Ensure proper array format
            .replace(/\]$/, ']');
          JSON.parse(cleanedString); // Test if it works
          fixedValue = cleanedString;
        } catch {
          // If cleaning doesn't work, use regex to extract numbers
          const matches = row.selected_engine_ids.match(/\d+/g);
          const numbers = matches ? matches.map(Number) : [];
          fixedValue = JSON.stringify(numbers);
          console.log(`Used regex extraction for schedule ${row.id}:`, numbers);
        }

        // Update the database
        await connection.execute(
          'UPDATE geo_scheduled_analyses SET selected_engine_ids = ? WHERE id = ?',
          [fixedValue, row.id]
        );

        console.log(`✅ Schedule ${row.id}: Fixed to "${fixedValue}"`);
        fixed++;
      }
    }

    console.log(`🎉 Fixed ${fixed} out of ${rows.length} scheduled analyses`);
  } catch (error) {
    console.error('❌ Error fixing scheduled analyses:', error);
  } finally {
    await connection.end();
  }
}

// Run the fix
fixScheduleEngineIds()
  .then(() => {
    console.log('✨ Scheduled analysis cleanup complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
