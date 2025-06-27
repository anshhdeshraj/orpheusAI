const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const router = express.Router();

// Cache for API responses (TTL: 10 minutes for most data, 30 minutes for static data)
const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes default
  checkperiod: 120 // Check for expired keys every 2 minutes
});

// Rate limiting for Perplexity API calls
const apiCallLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_API_CALLS_PER_MINUTE = 20; // Conservative limit for Perplexity

// Helper function to check rate limiting
const checkRateLimit = (identifier) => {
  const now = Date.now();
  const userCalls = apiCallLimiter.get(identifier) || [];
  
  // Remove calls older than the window
  const recentCalls = userCalls.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentCalls.length >= MAX_API_CALLS_PER_MINUTE) {
    return false;
  }
  
  recentCalls.push(now);
  apiCallLimiter.set(identifier, recentCalls);
  return true;
};

// Perplexity API helper function
const queryPerplexity = async (prompt, systemMessage = null) => {
  try {
    const messages = [];
    
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage
      });
    }
    
    messages.push({
      role: "user",
      content: prompt
    });

    const response = await axios.post(
      process.env.PERPLEXITY_API_URL,
      {
        model: "llama-3.1-sonar-small-128k-online",
        messages: messages,
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        return_citations: true,
        search_domain_filter: ["weather.com", "airnow.gov", "waze.com", "google.com", "cdc.gov", "pollen.com"],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: "day",
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Perplexity API Error:', error.response?.data || error.message);
    throw new Error(`Perplexity API failed: ${error.response?.data?.error || error.message}`);
  }
};

// Weather data fetcher using Perplexity
const getWeatherData = async (location) => {
  const cacheKey = `weather_${location.lat}_${location.lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Get current weather conditions for Indianapolis, Indiana. 
    Return data in JSON format with these exact fields:
    {
      "temperature": "number in Fahrenheit",
      "feelsLike": "number in Fahrenheit", 
      "conditions": "current weather description",
      "humidity": "percentage number",
      "uvIndex": "UV index number",
      "windSpeed": "speed in mph",
      "precipitation": "yes/no if rain/snow expected today",
      "heatWarning": "true/false if heat advisory in effect"
    }
    Only return the JSON object, no additional text.`;

    const systemMessage = "You are a weather data API. Always return valid JSON format with current, accurate weather information from reliable sources.";
    
    const response = await queryPerplexity(prompt, systemMessage);
    
    // Parse JSON response
    let weatherData;
    try {
      // Extract JSON from response if it contains additional text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      weatherData = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (parseError) {
      // Fallback parsing or default values
      weatherData = {
        temperature: "N/A",
        feelsLike: "N/A",
        conditions: "Data unavailable",
        humidity: "N/A",
        uvIndex: "N/A",
        windSpeed: "N/A",
        precipitation: false,
        heatWarning: false
      };
    }

    cache.set(cacheKey, weatherData, 600); // Cache for 10 minutes
    return weatherData;
  } catch (error) {
    console.error('Weather data error:', error);
    return {
      temperature: "N/A",
      feelsLike: "N/A", 
      conditions: "Data unavailable",
      humidity: "N/A",
      uvIndex: "N/A",
      windSpeed: "N/A",
      precipitation: false,
      heatWarning: false
    };
  }
};

// Air quality data fetcher using Perplexity
const getAirQualityData = async (location) => {
  const cacheKey = `air_quality_${location.lat}_${location.lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Get current air quality index (AQI) for Indianapolis, Indiana.
    Return data in JSON format:
    {
      "aqi": "AQI number",
      "quality": "Good/Moderate/Unhealthy/etc",
      "pm25": "PM2.5 value in μg/m³",
      "pollutants": ["list", "of", "main", "pollutants"],
      "healthImpact": "health advisory message if AQI > 100, null otherwise"
    }
    Only return the JSON object.`;

    const systemMessage = "You are an air quality data API. Return current AQI information from official sources like AirNow.gov or EPA.";
    
    const response = await queryPerplexity(prompt, systemMessage);
    
    let airQualityData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      airQualityData = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (parseError) {
      airQualityData = {
        aqi: "N/A",
        quality: "Data unavailable",
        pm25: "N/A",
        pollutants: [],
        healthImpact: null
      };
    }

    cache.set(cacheKey, airQualityData, 600);
    return airQualityData;
  } catch (error) {
    console.error('Air quality data error:', error);
    return {
      aqi: "N/A",
      quality: "Data unavailable", 
      pm25: "N/A",
      pollutants: [],
      healthImpact: null
    };
  }
};

// Traffic data fetcher using Perplexity
const getTrafficData = async (location) => {
  const cacheKey = `traffic_${location.lat}_${location.lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Get current traffic conditions for for Indianapolis, Indiana residents and surrounding major roads.
    Return data in JSON format:
    {
      "conditions": "Light/Moderate/Heavy",
      "estimatedDelay": "additional minutes or N/A",
      "closures": ["list of road closures"],
      "accidents": ["list of accidents"],
      "hotspots": ["list of congestion areas"]
    }
    Only return the JSON object.`;

    const systemMessage = "You are a traffic data API. Provide current traffic information from reliable sources like Google Maps, Waze, or local traffic authorities.";
    
    const response = await queryPerplexity(prompt, systemMessage);
    
    let trafficData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      trafficData = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (parseError) {
      trafficData = {
        conditions: "Moderate",
        estimatedDelay: "N/A",
        closures: ["No major closures reported"],
        accidents: [],
        hotspots: []
      };
    }

    cache.set(cacheKey, trafficData, 300); // Cache for 5 minutes (more dynamic)
    return trafficData;
  } catch (error) {
    console.error('Traffic data error:', error);
    return {
      conditions: "Moderate",
      estimatedDelay: "N/A",
      closures: ["No major closures reported"],
      accidents: [],
      hotspots: []
    };
  }
};

// Health data fetcher using Perplexity
const getHealthData = async (location, userPreferences) => {
  const cacheKey = `health_${location.lat}_${location.lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const allergiesFilter = userPreferences.allergies && userPreferences.allergies.length > 0 
      ? `Pay special attention to these allergens: ${userPreferences.allergies.join(', ')}.`
      : '';

    const prompt = `Get current health alerts for for Indianapolis, Indiana residents including pollen count, flu activity, and health advisories.
    ${allergiesFilter}
    Return data in JSON format:
    {
      "pollenCount": "Low/Moderate/High",
      "fluActivity": "Low/Moderate/High",
      "allergens": ["list", "of", "active", "allergens"],
      "covidUpdates": ["relevant covid alerts if any"],
      "healthAdvisories": ["list of current health advisories"]
    }
    Only return the JSON object.`;

    const systemMessage = "You are a health data API. Provide current health information from CDC, local health departments, and pollen tracking services.";
    
    const response = await queryPerplexity(prompt, systemMessage);
    
    let healthData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      healthData = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (parseError) {
      healthData = {
        pollenCount: "Moderate",
        fluActivity: "Low",
        allergens: [],
        covidUpdates: [],
        healthAdvisories: []
      };
    }

    cache.set(cacheKey, healthData, 1800); // Cache for 30 minutes
    return healthData;
  } catch (error) {
    console.error('Health data error:', error);
    return {
      pollenCount: "Moderate",
      fluActivity: "Low",
      allergens: [],
      covidUpdates: [],
      healthAdvisories: []
    };
  }
};

// Crime/Safety data fetcher using Perplexity
const getCrimeData = async (location) => {
  const cacheKey = `crime_${location.lat}_${location.lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Get recent crime and safety information for for Indianapolis, Indiana residents and surrounding areas (within 5 miles). Focus on incidents from the last 24-48 hours.
    Return data in JSON format:
    {
      "shootings": ["list of recent shooting incidents with general area only, no specific addresses"],
      "robberies": ["list of recent robbery incidents with general area only"],
      "incidents": ["other notable safety incidents"],
      "areasToAvoid": ["general areas with increased police activity or safety concerns"]
    }
    Only include verified incidents from news sources or police reports. Use general area descriptions, never specific addresses.
    Only return the JSON object.`;

    const systemMessage = "You are a public safety data API. Only report verified crime incidents from official sources like police departments or news outlets. Never include specific addresses, only general areas.";
    
    const response = await queryPerplexity(prompt, systemMessage);
    
    let crimeData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      crimeData = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (parseError) {
      crimeData = {
        shootings: [],
        robberies: [],
        incidents: [],
        areasToAvoid: []
      };
    }

    cache.set(cacheKey, crimeData, 1800); // Cache for 30 minutes
    return crimeData;
  } catch (error) {
    console.error('Crime data error:', error);
    return {
      shootings: [],
      robberies: [],
      incidents: [],
      areasToAvoid: []
    };
  }
};

// Business/Market data fetcher using Perplexity
const getMarketData = async (location) => {
  const cacheKey = `markets_${new Date().toDateString()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const prompt = `Check if today (${today}) has any business impacts for Indianapolis, Indiana residents:
    - Bank holidays or closures
    - Stock market closures
    - Modified business hours for major retailers/services
    - Government office closures
    Return data in JSON format:
    {
      "bankHolidays": ["list of bank holiday notices if any"],
      "marketClosures": ["stock market closure notices if any"],
      "businessHours": ["modified business hour notices if any"],
      "governmentOffices": ["government office closure notices if any"]
    }
    Only return the JSON object.`;

    const systemMessage = "You are a business information API. Provide current information about business closures, holidays, and market status. ";
    
    const response = await queryPerplexity(prompt, systemMessage);
    
    let marketData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      marketData = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (parseError) {
      marketData = {
        bankHolidays: [],
        marketClosures: [],
        businessHours: [],
        governmentOffices: []
      };
    }

    cache.set(cacheKey, marketData, 3600); // Cache for 1 hour
    return marketData;
  } catch (error) {
    console.error('Market data error:', error);
    return {
      bankHolidays: [],
      marketClosures: [],
      businessHours: [],
      governmentOffices: []
    };
  }
};

// Main route handler
router.post('/environmental-data', async (req, res) => {
  try {
    const { location, userPreferences } = req.body;

    // Validate required fields
    if (!location || !location.lat || !location.lng || !location.address) {
      return res.status(400).json({
        error: 'Missing required location data',
        required: ['location.lat', 'location.lng', 'location.address']
      });
    }

    // Check rate limiting
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again in a minute.'
      });
    }

    // Create a comprehensive cache key
    const cacheKey = `environmental_data_${location.lat}_${location.lng}_${JSON.stringify(userPreferences)}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    // Fetch all data concurrently
    console.log(`Fetching environmental data for ${location.address}...`);
    
    const [weather, airQuality, traffic, health, crime, markets] = await Promise.allSettled([
      getWeatherData(location),
      getAirQualityData(location),
      getTrafficData(location),
      getHealthData(location, userPreferences || {}),
      getCrimeData(location),
      getMarketData(location)
    ]);

    // Process results and handle any failures gracefully
    const environmentalData = {
      weather: weather.status === 'fulfilled' ? weather.value : null,
      airQuality: airQuality.status === 'fulfilled' ? airQuality.value : null,
      traffic: traffic.status === 'fulfilled' ? traffic.value : null,
      health: health.status === 'fulfilled' ? health.value : null,
      crime: crime.status === 'fulfilled' ? crime.value : null,
      markets: markets.status === 'fulfilled' ? markets.value : null,
      lastUpdated: new Date().toISOString(),
      location: location.address
    };

    // Log any failures
    const failures = [weather, airQuality, traffic, health, crime, markets]
      .filter(result => result.status === 'rejected')
      .map(result => result.reason?.message);
    
    if (failures.length > 0) {
      console.warn('Some data sources failed:', failures);
    }

    // Cache the combined result for 5 minutes
    cache.set(cacheKey, environmentalData, 300);

    res.json(environmentalData);

  } catch (error) {
    console.error('Environmental data route error:', error);
    res.status(500).json({
      error: 'Failed to fetch environmental data',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// Health check route for alerts service
router.get('/health', (req, res) => {
  const cacheStats = cache.getStats();
  res.json({
    status: 'healthy',
    service: 'alerts',
    cache: {
      keys: cacheStats.keys,
      hits: cacheStats.hits,
      misses: cacheStats.misses
    },
    rateLimiting: {
      activeClients: apiCallLimiter.size
    },
    timestamp: new Date().toISOString()
  });
});

// Cache management route (for debugging)
router.get('/cache/stats', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    const stats = cache.getStats();
    const keys = cache.keys();
    res.json({
      stats,
      keys: keys.map(key => ({
        key,
        ttl: cache.getTtl(key)
      }))
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Clear cache route (for debugging)
router.delete('/cache/clear', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    cache.flushAll();
    res.json({ message: 'Cache cleared successfully' });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = router;