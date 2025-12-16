import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { postToSlack } from '../../../utils/postToSlack';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const pool = mysql.createPool(dbConfig);

interface WeatherAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  expires: string;
  areas?: Array<{
    name: string;
    state: string;
  }>;
}

interface XWeatherAlert {
  id: string;
  details: {
    type: string;
    name: string;
    body: string;
    cat: string;
    priority: number;
    emergency: boolean;
  };
  timestamps: {
    expires: number;
    expiresISO: string;
  };
  active: boolean;
}

interface XWeatherResponse {
  success: boolean;
  error?: any;
  response: XWeatherAlert[];
}

interface MonitoredCity {
  id: number;
  city_name: string;
  state_code: string;
  latitude: number;
  longitude: number;
  slack_channel: string;
  client_id?: number;
}

const WINTER_STORM_KEYWORDS = [
  'winter storm',
  'blizzard',
  'ice storm',
  'freezing rain',
  'heavy snow',
  'snow squall',
  'winter weather',
  'frost',
  'freeze',
  'wind chill',
  'wind',
];

const getSeverityFromPriority = (priority: number): string => {
  // XWeather priority scale: lower numbers = higher severity
  if (priority <= 30) return 'extreme';
  if (priority <= 60) return 'severe';
  if (priority <= 90) return 'moderate';
  return 'minor';
};

const isWinterStormAlert = (alert: WeatherAlert): boolean => {
  const searchText = `${alert.type} ${alert.title} ${alert.description}`.toLowerCase();
  return WINTER_STORM_KEYWORDS.some(keyword => searchText.includes(keyword));
};

const getMonitoredCities = async (): Promise<MonitoredCity[]> => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT id, city_name, state_code, latitude, longitude, slack_channel, client_id FROM weather_monitored_cities WHERE active = true'
    );
    return rows as MonitoredCity[];
  } finally {
    connection.release();
  }
};

const checkIfAlertAlreadySent = async (cityId: number, alertId: string): Promise<boolean> => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT id FROM weather_alerts_sent WHERE city_id = ? AND alert_id = ? AND DATE(sent_at) = CURDATE()',
      [cityId, alertId]
    );
    return (rows as any[]).length > 0;
  } finally {
    connection.release();
  }
};

const saveAlertAsSent = async (
  cityId: number,
  alert: WeatherAlert,
  slackChannel: string,
  slackMessageTs?: string
): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `INSERT INTO weather_alerts_sent 
       (city_id, alert_id, alert_type, alert_title, alert_description, severity, expires_at, slack_channel, slack_message_ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cityId,
        alert.id,
        alert.type,
        alert.title,
        alert.description,
        alert.severity,
        alert.expires ? new Date(alert.expires) : null,
        slackChannel,
        slackMessageTs || null
      ]
    );
  } finally {
    connection.release();
  }
};

const fetchWeatherAlerts = async (city: MonitoredCity): Promise<WeatherAlert[]> => {
  const xweatherApiKey = process.env.XWEATHER_API_KEY;
  const xweatherApiSecret = process.env.XWEATHER_API_SECRET;
  
  if (!xweatherApiKey || !xweatherApiSecret) {
    throw new Error('XWeather API credentials not configured');
  }

  const url = `https://api.aerisapi.com/alerts/${city.latitude},${city.longitude}?client_id=${xweatherApiKey}&client_secret=${xweatherApiSecret}&format=json&filter=active&limit=50`;
  
  console.log(`Fetching weather alerts for ${city.city_name}, ${city.state_code}`);
  
  const response = await fetch(url);
  const data: XWeatherResponse = await response.json();
  
  console.log(`XWeather API response for ${city.city_name}:`, JSON.stringify(data, null, 2));
  
  if (!data.success) {
    throw new Error(`XWeather API error: ${JSON.stringify(data.error)}`);
  }
  
  // Handle cases where response is empty
  if (!data.response || data.response.length === 0) {
    console.log(`No alerts found for ${city.city_name}, ${city.state_code}`);
    return [];
  }
  
  // Convert XWeather alerts to our WeatherAlert format
  const alerts: WeatherAlert[] = data.response.map(xAlert => ({
    id: xAlert.id,
    type: xAlert.details.type,
    title: xAlert.details.name,
    description: xAlert.details.body,
    severity: getSeverityFromPriority(xAlert.details.priority),
    expires: xAlert.timestamps.expiresISO
  }));
  
  console.log(`Converted ${alerts.length} alerts for ${city.city_name}, ${city.state_code}`);
  
  return alerts;
};

const formatSlackMessage = (city: MonitoredCity, alert: WeatherAlert): string => {
  const emoji = getAlertEmoji(alert.severity);
  const cityLabel = `${city.city_name}, ${city.state_code}`;
  
  return `${emoji} *Weather Alert for ${cityLabel}*

*Type:* ${alert.type}
*Severity:* ${alert.severity}
*Title:* ${alert.title}

*Description:*
${alert.description}

${alert.expires ? `*Expires:* ${new Date(alert.expires).toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT` : ''}

Alert ID: \`${alert.id}\``;
};

const getAlertEmoji = (severity: string): string => {
  switch (severity?.toLowerCase()) {
    case 'extreme': return '🔴';
    case 'severe': return '🟠';
    case 'moderate': return '🟡';
    case 'minor': return '🟢';
    default: return '❄️';
  }
};

const sendHeartbeatIfNeeded = async (results: any) => {
  // Only send heartbeat if WEATHER_HEARTBEAT_HOURS is set
  const heartbeatHours = process.env.WEATHER_HEARTBEAT_HOURS;
  if (!heartbeatHours) return;

  const hours = parseInt(heartbeatHours);
  if (isNaN(hours) || hours <= 0) return;

  const connection = await pool.getConnection();
  try {
    // Check when we last sent a heartbeat
    const [rows] = await connection.execute(
      `SELECT MAX(sent_at) as last_heartbeat 
       FROM weather_alerts_sent 
       WHERE alert_id = 'HEARTBEAT' 
       AND sent_at > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hours]
    );

    const lastHeartbeat = (rows as any[])[0]?.last_heartbeat;
    
    // If no recent heartbeat, send one
    if (!lastHeartbeat) {
      const heartbeatMessage = `🤖 **Weather Monitor Heartbeat**

System Status: ✅ Active
Cities Monitored: ${results.citiesChecked}
Last Check: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT

${results.alertsFound > 0 ? `🌨️ Found ${results.alertsFound} weather alerts, sent ${results.alertsSent} new notifications` : '☀️ No active winter weather alerts found'}

${results.errors.length > 0 ? `⚠️ Errors encountered: ${results.errors.length}` : '✅ All cities checked successfully'}

_This heartbeat confirms the weather monitoring system is running every ${hours} hour${hours > 1 ? 's' : ''}_`;

      // Send to the first active city's channel (or could be configurable)
      const [cityRows] = await connection.execute(
        'SELECT slack_channel FROM weather_monitored_cities WHERE active = true LIMIT 1'
      );
      
      if ((cityRows as any[]).length > 0) {
        const channel = (cityRows as any[])[0].slack_channel;
        await postToSlack(heartbeatMessage, channel);
        
        // Record the heartbeat in the database
        await connection.execute(
          `INSERT INTO weather_alerts_sent 
           (city_id, alert_id, alert_type, alert_title, alert_description, severity, slack_channel)
           SELECT id, 'HEARTBEAT', 'system', 'Weather Monitor Heartbeat', ?, 'minor', ?
           FROM weather_monitored_cities WHERE active = true LIMIT 1`,
          [heartbeatMessage, channel]
        );
        
        console.log(`Sent weather monitor heartbeat to #${channel}`);
      }
    }
  } finally {
    connection.release();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Starting weather alerts check at', new Date().toISOString());
  
  try {
    const cities = await getMonitoredCities();
    console.log(`Found ${cities.length} cities to monitor`);
    
    const results = {
      citiesChecked: 0,
      alertsFound: 0,
      alertsSent: 0,
      errors: [] as string[]
    };

    for (const city of cities) {
      try {
        results.citiesChecked++;
        
        const alerts = await fetchWeatherAlerts(city);
        const winterStormAlerts = alerts.filter(isWinterStormAlert);
        
        results.alertsFound += winterStormAlerts.length;
        
        console.log(`${city.city_name}, ${city.state_code}: Found ${winterStormAlerts.length} winter storm alerts`);
        
        for (const alert of winterStormAlerts) {
          const alreadySent = await checkIfAlertAlreadySent(city.id, alert.id);
          
          if (!alreadySent) {
            const slackMessage = formatSlackMessage(city, alert);
            
            // Send to Slack
            await postToSlack(slackMessage, city.slack_channel);
            
            // Save as sent
            await saveAlertAsSent(city.id, alert, city.slack_channel);
            
            results.alertsSent++;
            console.log(`Sent alert ${alert.id} for ${city.city_name}, ${city.state_code}`);
          } else {
            console.log(`Alert ${alert.id} already sent today for ${city.city_name}, ${city.state_code}`);
          }
        }
        
        // Add small delay between cities to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        const errorMessage = `Error checking ${city.city_name}, ${city.state_code}: ${error.message}`;
        console.error(errorMessage);
        results.errors.push(errorMessage);
      }
    }
    
    console.log('Weather check completed:', results);
    
    // Send heartbeat message if configured and it's been a while since last heartbeat
    await sendHeartbeatIfNeeded(results);
    
    return res.status(200).json({
      success: true,
      message: 'Weather alerts check completed',
      results
    });
    
  } catch (error: any) {
    console.error('Fatal error in weather alerts check:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}