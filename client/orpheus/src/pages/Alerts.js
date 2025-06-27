import React, { useState, useEffect } from 'react';

import './styles/alerts.css';

const Alert = () => {
  const [userData, setUserData] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState({
    weather: null,
    airQuality: null,
    traffic: null,
    health: null,
    crime: null,
    markets: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Get user data from session storage
    const storedUserData = sessionStorage.getItem('userData');
    if (storedUserData) {
      try {
        const parsedData = JSON.parse(storedUserData);
        setUserData(parsedData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setEnvironmentalData(prev => ({ ...prev, error: 'Invalid user data format' }));
      }
    } else {
      setEnvironmentalData(prev => ({ ...prev, error: 'No user data found in session storage' }));
    }
  }, []);

  useEffect(() => {
    if (userData) {
      fetchEnvironmentalData();
    }
  }, [userData]);

  const fetchEnvironmentalData = async () => {
    try {
      setEnvironmentalData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('http://localhost:3000/api/alerts/environmental-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location: userData.location,
          userPreferences: {
            bloodGroup: userData.bloodGroup,
            allergies: userData.allergies,
            medications: userData.medications
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      setEnvironmentalData({
        ...data,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching environmental data:', error);
      setEnvironmentalData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch environmental data'
      }));
    }
  };

  // Enhanced personalized recommendations
  const generatePersonalizedRecommendations = () => {
    if (!userData || environmentalData.loading) return [];
    
    const recommendations = [];
    const { weather, airQuality, traffic, health, crime } = environmentalData;

    // Weather-based recommendations
    if (weather) {
      // UV Protection recommendations
      const uvIndex = parseInt(weather.uvIndex) || 0;
      if (uvIndex >= 8) {
        recommendations.push({
          type: 'weather',
          icon: '☀️',
          title: 'Extreme UV Alert',
          message: `UV Index ${uvIndex}: Apply SPF 50+ sunscreen every 2 hours. Wear wide-brim hat, UV-blocking sunglasses. Seek shade 10AM-4PM.`,
          priority: 'high'
        });
      } else if (uvIndex >= 6) {
        recommendations.push({
          type: 'weather',
          icon: '🌤️',
          title: 'High UV Protection',
          message: `UV Index ${uvIndex}: Use SPF 30+ sunscreen. Reapply every 2 hours. Wear protective clothing.`,
          priority: 'medium'
        });
      }

      // Temperature-based recommendations
      if (weather.temperature !== 'N/A') {
        const temp = parseInt(weather.temperature);
        if (temp > 95) {
          recommendations.push({
            type: 'weather',
            icon: '🥵',
            title: 'Extreme Heat Warning',
            message: `${temp}°F: Stay indoors during peak hours. Drink water every 15-20 minutes. ${userData.bloodGroup === 'B+' ? 'B+ blood type may be more sensitive to heat stress.' : ''}`,
            priority: 'high'
          });
        } else if (temp < 32) {
          recommendations.push({
            type: 'weather',
            icon: '🥶',
            title: 'Freezing Alert',
            message: `${temp}°F: Dress in layers. Protect extremities. Check tire pressure and battery.`,
            priority: 'high'
          });
        }
      }

      // Precipitation recommendations
      if (weather.precipitation) {
        recommendations.push({
          type: 'weather',
          icon: '☔',
          title: 'Rain Expected - Take Precautions',
          message: `${userData.name}, carry waterproof jacket and umbrella. Allow extra 10-15 minutes for travel from Indianapolis, Indiana.`,
          priority: 'high'
        });
      }
    }

    // Air Quality recommendations
    if (airQuality) {
      const aqi = parseInt(airQuality.aqi) || 0;
      
      if (aqi > 150) {
        recommendations.push({
          type: 'air',
          icon: '😷',
          title: 'Unhealthy Air - Mask Required',
          message: `AQI ${aqi}: Wear N95/KN95 mask outdoors. Avoid outdoor exercise. Close windows. Use air purifier if available.`,
          priority: 'high'
        });
      } else if (aqi > 100) {
        recommendations.push({
          type: 'air',
          icon: '😐',
          title: 'Moderate Air Quality',
          message: `AQI ${aqi}: Consider mask for sensitive individuals. Limit prolonged outdoor exertion.`,
          priority: 'medium'
        });
      }

      // PM2.5 specific recommendations
      if (airQuality.pm25 !== 'N/A' && parseInt(airQuality.pm25) > 35) {
        recommendations.push({
          type: 'air',
          icon: '🌫️',
          title: 'High Fine Particle Levels',
          message: `PM2.5: ${airQuality.pm25} μg/m³. Use KN95 mask outdoors. Run air purifier indoors. ${userData.allergies.length > 0 ? 'Extra caution due to your allergies.' : ''}`,
          priority: 'high'
        });
      }
    }

    // Traffic recommendations
    if (traffic) {
      if (traffic.conditions === 'Heavy') {
        recommendations.push({
          type: 'traffic',
          icon: '🚗',
          title: 'Heavy Traffic Alert',
          message: `Heavy congestion expected. ${traffic.estimatedDelay !== 'N/A' ? `Allow extra ${traffic.estimatedDelay} minutes.` : 'Allow extra travel time.'} Consider alternate routes.`,
          priority: 'medium'
        });
      }

      // Road closures
      if (traffic.closures && traffic.closures.length > 0 && traffic.closures[0] !== 'No major closures reported') {
        traffic.closures.forEach((closure, index) => {
          if (index < 2) {
            recommendations.push({
              type: 'traffic',
              icon: '🚧',
              title: 'Road Closure Alert',
              message: `${closure}. Plan alternate route from ${userData.location.address}. Use navigation app for real-time updates.`,
              priority: 'medium'
            });
          }
        });
      }
    }

    // Health recommendations
    if (health) {
      // Pollen recommendations
      if (health.pollenCount === 'High') {
        const userHasAllergies = userData.allergies && userData.allergies.length > 0;
        recommendations.push({
          type: 'health',
          icon: '🤧',
          title: 'High Pollen Alert',
          message: `High pollen levels detected. ${userHasAllergies ? 'Take antihistamine as prescribed.' : 'Consider antihistamine if sensitive.'} Keep windows closed. Shower after outdoor activities.`,
          priority: userHasAllergies ? 'high' : 'medium'
        });
      }

      // Allergen-specific recommendations
      if (health.allergens && health.allergens.length > 0) {
        const userAllergens = userData.allergies || [];
        const matchingAllergens = health.allergens.filter(allergen => 
          userAllergens.some(userAllergen => 
            allergen.toLowerCase().includes(userAllergen.toLowerCase())
          )
        );

        if (matchingAllergens.length > 0) {
          recommendations.push({
            type: 'health',
            icon: '⚠️',
            title: 'Personal Allergen Alert',
            message: `Your allergens detected: ${matchingAllergens.join(', ')}. Take preventive medication. Limit outdoor exposure.`,
            priority: 'high'
          });
        }
      }
    }

    // Crime and safety recommendations
    if (crime) {
      if (crime.shootings && crime.shootings.length > 0) {
        recommendations.push({
          type: 'safety',
          icon: '🚨',
          title: 'Safety Alert - Incidents Reported',
          message: 'Recent safety incidents reported. Stay alert. Avoid isolated areas. Report suspicious activity.',
          priority: 'high'
        });
      }

      if (crime.areasToAvoid && crime.areasToAvoid.length > 0) {
        recommendations.push({
          type: 'safety',
          icon: '📍',
          title: 'Areas of Concern',
          message: `Exercise caution in: ${crime.areasToAvoid.join(', ')}. Plan safer alternate routes.`,
          priority: 'medium'
        });
      }
    }

    // Market and business recommendations
    if (environmentalData.markets) {
      const { bankHolidays, marketClosures, businessHours } = environmentalData.markets;
      
      if (bankHolidays && bankHolidays.length > 0) {
        recommendations.push({
          type: 'business',
          icon: '🏦',
          title: 'Bank Holiday Notice',
          message: 'Banks are closed today. Plan banking activities accordingly. ATMs remain available.',
          priority: 'low'
        });
      }

      if (marketClosures && marketClosures.length > 0) {
        recommendations.push({
          type: 'business',
          icon: '📈',
          title: 'Market Closure',
          message: 'Stock market closure affects trading today. Plan investment activities accordingly.',
          priority: 'low'
        });
      }
    }

    // Sort recommendations by priority
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  };

  if (environmentalData.loading) {
    return (
      <div className="alert-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Fetching real-time environmental data for {userData?.location?.address}...</p>
        </div>
      </div>
    );
  }

  if (environmentalData.error) {
    return (
      <div className="alert-container">
        <div className="alert-error">
          <h3>Unable to fetch environmental data</h3>
          <p>{environmentalData.error}</p>
          <button 
            onClick={fetchEnvironmentalData} 
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const recommendations = generatePersonalizedRecommendations();

  return (
    <>
    {/* <Sidebar/> */}
    <div className="alert-container">
      <div className="alert-header">
        <a className='header-link' href='/'>Go Back</a>
        <h1 className="alert-title">Environmental Alerts & Recommendations</h1>
        {userData && (
          <div className="user-location">
            <span className="location-icon">📍</span>
            <span>Indiana</span>
          </div>
        )}
      </div>

      {/* Environmental Data Grid */}
      <div className="environmental-grid">
        {/* Weather Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🌤️</span>
            <h3>Weather Conditions</h3>
          </div>
          <div className="card-content">
            {environmentalData.weather ? (
              <>
                <div className="weather-info">
                  <div className="temp">{environmentalData.weather.temperature}°F</div>
                  <div>
                    <div className="condition">{environmentalData.weather.conditions}</div>
                    <div className="feels-like">
                      Feels like {environmentalData.weather.feelsLike}°F
                    </div>
                  </div>
                </div>
                <div className="weather-details">
                  <div className="detail">
                    <span>Humidity</span>
                    <span>{environmentalData.weather.humidity}%</span>
                  </div>
                  <div className="detail">
                    <span>UV Index</span>
                    <span>{environmentalData.weather.uvIndex}</span>
                  </div>
                  <div className="detail">
                    <span>Wind</span>
                    <span>{environmentalData.weather.windSpeed} mph</span>
                  </div>
                </div>
                {environmentalData.weather.heatWarning && (
                  <div className="weather-warning">
                    ⚠️ Heat Warning in Effect
                  </div>
                )}
              </>
            ) : (
              <p>Weather data unavailable</p>
            )}
          </div>
        </div>

        {/* Air Quality Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🌫️</span>
            <h3>Air Quality</h3>
          </div>
          <div className="card-content">
            {environmentalData.airQuality ? (
              <>
                <div className="aqi-info">
                  <div className="aqi-value">{environmentalData.airQuality.aqi}</div>
                  <div>
                    <div className="aqi-level">{environmentalData.airQuality.quality}</div>
                    <div className="pm25-info">
                      PM2.5: {environmentalData.airQuality.pm25}
                    </div>
                  </div>
                </div>
                {environmentalData.airQuality.pollutants && environmentalData.airQuality.pollutants.length > 0 && (
                  <div className="pollutants">
                    Main pollutants: {environmentalData.airQuality.pollutants.join(', ')}
                  </div>
                )}
                {environmentalData.airQuality.healthImpact && (
                  <div className="health-impact">
                    ⚠️ {environmentalData.airQuality.healthImpact}
                  </div>
                )}
              </>
            ) : (
              <p>Air quality data unavailable</p>
            )}
          </div>
        </div>

        {/* Traffic Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🚗</span>
            <h3>Traffic Conditions</h3>
          </div>
          <div className="card-content">
            {environmentalData.traffic ? (
              <>
                <div className="traffic-status">{environmentalData.traffic.conditions}</div>
                {environmentalData.traffic.estimatedDelay !== 'N/A' && (
                  <div className="traffic-delay">
                    Estimated delay: {environmentalData.traffic.estimatedDelay}
                  </div>
                )}
                <div className="traffic-alerts">
                  {environmentalData.traffic.closures && environmentalData.traffic.closures.map((closure, index) => (
                    <div key={index} className="alert-item">🚧 {closure}</div>
                  ))}
                  {environmentalData.traffic.accidents && environmentalData.traffic.accidents.map((accident, index) => (
                    <div key={index} className="alert-item">🚨 {accident}</div>
                  ))}
                </div>
                {environmentalData.traffic.hotspots && environmentalData.traffic.hotspots.length > 0 && (
                  <div className="traffic-hotspots">
                    <strong>Congestion at:</strong> {environmentalData.traffic.hotspots.join(', ')}
                  </div>
                )}
              </>
            ) : (
              <p>Traffic data unavailable</p>
            )}
          </div>
        </div>

        {/* Health Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🏥</span>
            <h3>Health Alerts</h3>
          </div>
          <div className="card-content">
            {environmentalData.health ? (
              <div className="health-info">
                <div className="pollen">
                  🌸 Pollen: {environmentalData.health.pollenCount}
                </div>
                <div className="flu-activity">
                  🦠 Flu Activity: {environmentalData.health.fluActivity}
                </div>
                {environmentalData.health.allergens && environmentalData.health.allergens.length > 0 && (
                  <div className="allergens">
                    <strong>Allergens:</strong> {environmentalData.health.allergens.join(', ')}
                  </div>
                )}
                {environmentalData.health.covidUpdates && environmentalData.health.covidUpdates.length > 0 && (
                  <div className="covid-alert">
                    📢 {environmentalData.health.covidUpdates.join(', ')}
                  </div>
                )}
                {environmentalData.health.healthAdvisories && environmentalData.health.healthAdvisories.length > 0 && (
                  <div className="health-advisories">
                    {environmentalData.health.healthAdvisories.map((advisory, index) => (
                      <div key={index}>⚠️ {advisory}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p>Health data unavailable</p>
            )}
          </div>
        </div>

        {/* Crime & Safety Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🚨</span>
            <h3>Safety Alerts</h3>
          </div>
          <div className="card-content">
            {environmentalData.crime ? (
              <div>
                {environmentalData.crime.shootings && environmentalData.crime.shootings.length > 0 && (
                  <div className="crime-alerts">
                    {environmentalData.crime.shootings.map((shooting, index) => (
                      <div key={index} className="alert-item critical">
                        🔫 {shooting}
                      </div>
                    ))}
                  </div>
                )}
                {environmentalData.crime.robberies && environmentalData.crime.robberies.length > 0 && (
                  <div className="crime-alerts">
                    {environmentalData.crime.robberies.map((robbery, index) => (
                      <div key={index} className="alert-item warning">
                        💰 {robbery}
                      </div>
                    ))}
                  </div>
                )}
                {environmentalData.crime.incidents && environmentalData.crime.incidents.length > 0 && (
                  <div>
                    {environmentalData.crime.incidents.map((incident, index) => (
                      <div key={index} className="alert-item">
                        📋 {incident}
                      </div>
                    ))}
                  </div>
                )}
                {environmentalData.crime.areasToAvoid && environmentalData.crime.areasToAvoid.length > 0 && (
                  <div className="areas-to-avoid">
                    <strong>Exercise caution:</strong> {environmentalData.crime.areasToAvoid.join(', ')}
                  </div>
                )}
                {(!environmentalData.crime.shootings || environmentalData.crime.shootings.length === 0) && 
                 (!environmentalData.crime.robberies || environmentalData.crime.robberies.length === 0) && 
                 (!environmentalData.crime.incidents || environmentalData.crime.incidents.length === 0) && (
                  <p className="no-alerts">✅ No major safety alerts</p>
                )}
              </div>
            ) : (
              <p>Safety data unavailable</p>
            )}
          </div>
        </div>

        {/* Business & Markets Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🏦</span>
            <h3>Business & Markets</h3>
          </div>
          <div className="card-content">
            {environmentalData.markets ? (
              <div>
                {environmentalData.markets.bankHolidays && environmentalData.markets.bankHolidays.length > 0 && (
                  <div className="alert-item">
                    🏦 {environmentalData.markets.bankHolidays[0]}
                  </div>
                )}
                {environmentalData.markets.marketClosures && environmentalData.markets.marketClosures.length > 0 && (
                  <div className="alert-item">
                    📈 {environmentalData.markets.marketClosures[0]}
                  </div>
                )}
                {environmentalData.markets.businessHours && environmentalData.markets.businessHours.length > 0 && (
                  <div className="alert-item">
                    🏢 {environmentalData.markets.businessHours[0]}
                  </div>
                )}
                {environmentalData.markets.governmentOffices && environmentalData.markets.governmentOffices.length > 0 && (
                  <div className="alert-item">
                    🏛️ {environmentalData.markets.governmentOffices[0]}
                  </div>
                )}
                {(!environmentalData.markets.bankHolidays || environmentalData.markets.bankHolidays.length === 0) && 
                 (!environmentalData.markets.marketClosures || environmentalData.markets.marketClosures.length === 0) && 
                 (!environmentalData.markets.businessHours || environmentalData.markets.businessHours.length === 0) && (
                  <p className="no-alerts">✅ Normal business operations</p>
                )}
              </div>
            ) : (
              <p>Business data unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h2 className="recommendations-title">
            {userData ? `Personalized Recommendations for ${userData.name}` : 'Daily Recommendations'}
          </h2>
          <div className="recommendations-grid">
            {recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-card priority-${rec.priority}`}>
                <div className="rec-icon">{rec.icon}</div>
                <div className="rec-content">
                  <h4 className="rec-title">{rec.title}</h4>
                  <p className="rec-message">{rec.message}</p>
                </div>
                <div className={`priority-indicator ${rec.priority}`}></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Alert;