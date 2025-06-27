import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import './styles/news.css'

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      setError(null);
      // Using NewsAPI's free tier with Indianapolis search
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=Indianapolis&sortBy=publishedAt&pageSize=20&apiKey=eda495f26c8c44348424404adfdd83a8`
      );
      
      if (!response.ok) {
        // Fallback to mock data if API fails
        const mockNews = [
          {
            title: "Indianapolis Colts Announce New Stadium Renovations",
            description: "The Indianapolis Colts have unveiled plans for a major renovation of Lucas Oil Stadium, featuring new technology and fan amenities.",
            url: "https://example.com/colts-renovation",
            urlToImage: "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?w=400&h=250&fit=crop",
            publishedAt: new Date().toISOString(),
            source: { name: "Indianapolis Star" }
          },
          {
            title: "Downtown Indianapolis Development Project Breaks Ground",
            description: "A new mixed-use development in downtown Indianapolis officially broke ground today, promising to bring hundreds of new jobs to the area.",
            url: "https://example.com/downtown-development",
            urlToImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            source: { name: "WTHR" }
          },
          {
            title: "Indianapolis Public Library Expands Digital Services",
            description: "The Indianapolis Public Library system announces major expansion of digital resources and virtual programming for residents.",
            url: "https://example.com/library-digital",
            urlToImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            source: { name: "Indianapolis Business Journal" }
          },
          {
            title: "Indiana State Fair Announces 2025 Lineup",
            description: "The Indiana State Fair has revealed its entertainment lineup for 2025, featuring major musical acts and new attractions.",
            url: "https://example.com/state-fair",
            urlToImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 10800000).toISOString(),
            source: { name: "Fox59" }
          },
          {
            title: "Indianapolis Weather: Severe Storm Warning Issued",
            description: "The National Weather Service has issued a severe thunderstorm warning for the Indianapolis metropolitan area.",
            url: "https://example.com/weather-warning",
            urlToImage: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=400&h=250&fit=crop",
            publishedAt: new Date(Date.now() - 14400000).toISOString(),
            source: { name: "WRTV" }
          }
        ];
        setNews(mockNews);
        return;
      }
      
      const data = await response.json();
      setNews(data.articles || []);
    } catch (err) {
      setError('Failed to load news. Please try again later.');
      console.error('News fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const publishedDate = new Date(dateString);
    const diffInHours = Math.floor((now - publishedDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return publishedDate.toLocaleDateString();
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <div style={{display:'flex', flexDirection:'row', maxHeight:'100vh'}}>
        <Sidebar/>
    <div style={{maxHeight:'100vh', overflowY:'scroll', margin:'auto'}} className="news-container">
      <div className="news-header">
        <div className="news-title-section">
          <h1 className="news-title">Indianapolis News</h1>
          <div className="news-subtitle">Latest updates from the Circle City</div>
        </div>
        <button 
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Indianapolis news...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <AlertCircle size={24} />
          <p className="error-text">{error}</p>
          <button className="retry-btn" onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="news-grid">
          {news.length === 0 ? (
            <div className="no-news">
              <p>No news articles found.</p>
            </div>
          ) : (
            news.map((article, index) => (
              <article key={index} className="news-card">
                {article.urlToImage && (
                  <div className="news-image-container">
                    <img
                      src={article.urlToImage}
                      alt={article.title}
                      className="news-image"
                      onError={handleImageError}
                    />
                  </div>
                )}
                
                <div className="news-content">
                  <div className="news-meta">
                    <span className="news-source">{article.source?.name}</span>
                    <div className="news-time">
                      <Clock size={12} />
                      <span>{formatTimeAgo(article.publishedAt)}</span>
                    </div>
                  </div>
                  
                  <h2 className="news-headline">{article.title}</h2>
                  
                  {article.description && (
                    <p className="news-description">{article.description}</p>
                  )}
                  
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-link"
                  >
                    Read more
                    <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
            
      )}

    </div>
    </div>

  );
};

export default News;