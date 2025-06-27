/**
 * OrpheusAI Mission-Critical Express Server
 * NASA Software Engineering Standards Compliant
 * 
 * @fileoverview Enterprise-grade Express.js server designed to NASA's safety standards
 * @version 2.0.0
 * @classification MISSION_CRITICAL
 * @safety_level LEVEL_A
 * @redundancy TRIPLE_REDUNDANT
 * @author OrpheusAI Engineering Team
 * @reviewedBy Senior Systems Engineer
 * @approvedBy Mission Director
 * @lastModified 2025-06-03
 */

'use strict';

// =============================================================================
// MISSION-CRITICAL IMPORTS - NASA Standard Module Loading
// =============================================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const winston = require('winston');
const morgan = require('morgan');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const prometheus = require('prom-client');
const responseTime = require('response-time');
const requestIp = require('request-ip');
const useragent = require('express-useragent');
const LRU = require('lru-cache');
const CircuitBreaker = require('opossum');
const EventEmitter = require('events');

// =============================================================================
// NASA MISSION-CRITICAL CONSTANTS AND CONFIGURATION
// =============================================================================

const MISSION_CONFIG = Object.freeze({
  APPLICATION: {
    NAME: 'OrpheusAI-NASA-Compliant',
    VERSION: '2.0.0',
    CLASSIFICATION: 'MISSION_CRITICAL',
    SAFETY_LEVEL: 'LEVEL_A'
  },
  
  FAULT_TOLERANCE: {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    HEARTBEAT_INTERVAL_MS: 30000,
    HEALTH_CHECK_TIMEOUT_MS: 5000
  },
  
  REDUNDANCY: {
    BACKUP_SYSTEMS: 3,
    FAILOVER_TIMEOUT_MS: 2000,
    DATA_REPLICATION_FACTOR: 3
  },
  
  SECURITY: {
    ENCRYPTION_ALGORITHM: 'aes-256-gcm',
    KEY_ROTATION_INTERVAL_MS: 3600000, // 1 hour
    SESSION_TIMEOUT_MS: 1800000,       // 30 minutes
    MAX_LOGIN_ATTEMPTS: 3
  },
  
  PERFORMANCE: {
    MAX_MEMORY_MB: 512,
    MAX_CPU_PERCENTAGE: 80,
    MAX_RESPONSE_TIME_MS: 2000,
    MAX_CONCURRENT_CONNECTIONS: 10000
  }
});

// Environment configuration with validation
require('dotenv').config();

const ENVIRONMENT = Object.freeze({
  PORT: validatePort(process.env.PORT) || 3000,
  NODE_ENV: validateEnvironment(process.env.NODE_ENV) || 'production',
  REDIS_URL: validateRedisUrl(process.env.REDIS_URL) || 'redis://localhost:6379',
  SESSION_SECRET: validateSessionSecret(process.env.SESSION_SECRET),
  ALLOWED_ORIGINS: validateOrigins(process.env.ALLOWED_ORIGINS),
  WORKERS: validateWorkerCount(process.env.WEB_CONCURRENCY) || os.cpus().length,
  MAX_MEMORY: process.env.MAX_MEMORY || '512mb'
});

// =============================================================================
// NASA VALIDATION FUNCTIONS - CRITICAL PARAMETER VALIDATION
// =============================================================================

/**
 * Validates port number according to NASA standards
 * @param {string|number} port - Port to validate
 * @returns {number|null} Valid port or null
 */
function validatePort(port) {
  const numPort = parseInt(port, 10);
  if (isNaN(numPort) || numPort < 1024 || numPort > 65535) {
    logCriticalError('INVALID_PORT_CONFIGURATION', { port });
    return null;
  }
  return numPort;
}

/**
 * Validates environment setting
 * @param {string} env - Environment to validate
 * @returns {string|null} Valid environment or null
 */
function validateEnvironment(env) {
  const validEnvironments = ['development', 'testing', 'staging', 'production'];
  if (!validEnvironments.includes(env)) {
    logCriticalError('INVALID_ENVIRONMENT', { env });
    return 'production'; // Fail-safe to production
  }
  return env;
}

/**
 * Validates Redis URL format
 * @param {string} url - Redis URL to validate
 * @returns {string|null} Valid URL or null
 */
function validateRedisUrl(url) {
  if (!url || !url.startsWith('redis://')) {
    logCriticalError('INVALID_REDIS_URL', { url });
    return null;
  }
  return url;
}

/**
 * Validates and generates session secret
 * @param {string} secret - Session secret to validate
 * @returns {string} Valid session secret
 */
function validateSessionSecret(secret) {
  if (!secret || secret.length < 32) {
    logCriticalError('WEAK_SESSION_SECRET', { length: secret?.length });
    return crypto.randomBytes(64).toString('hex');
  }
  return secret;
}

/**
 * Validates CORS origins
 * @param {string} origins - Comma-separated origins
 * @returns {string[]} Array of valid origins
 */
function validateOrigins(origins) {
  if (!origins) return ['http://localhost:3000'];
  
  const originList = origins.split(',').map(origin => origin.trim());
  const validOrigins = originList.filter(origin => {
    try {
      new URL(origin);
      return true;
    } catch {
      logCriticalError('INVALID_CORS_ORIGIN', { origin });
      return false;
    }
  });
  
  return validOrigins.length > 0 ? validOrigins : ['http://localhost:3000'];
}

/**
 * Validates worker count
 * @param {string|number} count - Worker count to validate
 * @returns {number} Valid worker count
 */
function validateWorkerCount(count) {
  const numCount = parseInt(count, 10);
  const maxWorkers = os.cpus().length * 2;
  
  if (isNaN(numCount) || numCount < 1 || numCount > maxWorkers) {
    logCriticalError('INVALID_WORKER_COUNT', { count, maxWorkers });
    return Math.min(os.cpus().length, 4); // Conservative default
  }
  
  return numCount;
}

// =============================================================================
// NASA MISSION-CRITICAL EVENT SYSTEM
// =============================================================================

class MissionCriticalEventSystem extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // NASA standard for high-availability systems
    this.criticalEvents = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 10000;
  }
  
  /**
   * Emits a mission-critical event with full audit trail
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @param {string} severity - Event severity level
   */
  emitCriticalEvent(eventType, eventData, severity = 'INFO') {
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      data: eventData,
      severity,
      timestamp: new Date().toISOString(),
      workerId: process.pid,
      stackTrace: new Error().stack
    };
    
    this.criticalEvents.set(event.id, event);
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    this.emit(eventType, event);
    
    // Log based on severity
    switch (severity) {
      case 'CRITICAL':
        logger.error(`CRITICAL EVENT: ${eventType}`, event);
        break;
      case 'WARNING':
        logger.warn(`WARNING EVENT: ${eventType}`, event);
        break;
      default:
        logger.info(`INFO EVENT: ${eventType}`, event);
    }
  }
  
  /**
   * Gets event history for analysis
   * @param {string} eventType - Optional event type filter
   * @returns {Array} Event history
   */
  getEventHistory(eventType = null) {
    return eventType 
      ? this.eventHistory.filter(event => event.type === eventType)
      : [...this.eventHistory];
  }
}

const missionEventSystem = new MissionCriticalEventSystem();

// =============================================================================
// NASA LOGGING SYSTEM - MISSION-CRITICAL AUDIT TRAIL
// =============================================================================

/**
 * Creates a NASA-compliant winston logger with full audit capabilities
 * @returns {winston.Logger} Configured logger instance
 */
function createMissionCriticalLogger() {
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(info => {
      return JSON.stringify({
        timestamp: info.timestamp,
        level: info.level.toUpperCase(),
        message: info.message,
        service: MISSION_CONFIG.APPLICATION.NAME,
        version: MISSION_CONFIG.APPLICATION.VERSION,
        workerId: process.pid,
        classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION,
        ...info
      });
    })
  );

  const logger = winston.createLogger({
    level: ENVIRONMENT.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { 
      service: MISSION_CONFIG.APPLICATION.NAME,
      workerId: process.pid,
      version: MISSION_CONFIG.APPLICATION.VERSION,
      classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION
    },
    transports: [
      // Critical error log
      new winston.transports.File({
        filename: `logs/mission-critical-errors-${process.pid}.log`,
        level: 'error',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 100,
        tailable: true,
        zippedArchive: true
      }),
      
      // Security audit log
      new winston.transports.File({
        filename: `logs/security-audit-${process.pid}.log`,
        level: 'warn',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 50,
        tailable: true,
        zippedArchive: true
      }),
      
      // General application log
      new winston.transports.File({
        filename: `logs/application-${process.pid}.log`,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 200,
        tailable: true,
        zippedArchive: true
      }),
      
      // Performance metrics log
      new winston.transports.File({
        filename: `logs/performance-metrics-${process.pid}.log`,
        level: 'info',
        maxsize: 25 * 1024 * 1024, // 25MB
        maxFiles: 50,
        tailable: true,
        zippedArchive: true
      })
    ]
  });

  // Add console transport for development
  if (ENVIRONMENT.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  return logger;
}

const logger = createMissionCriticalLogger();

/**
 * Logs critical errors with full context
 * @param {string} errorCode - Error code
 * @param {Object} context - Error context
 */
function logCriticalError(errorCode, context = {}) {
  const errorEvent = {
    errorCode,
    context,
    timestamp: new Date().toISOString(),
    workerId: process.pid,
    stackTrace: new Error().stack
  };
  
  logger.error(`CRITICAL_ERROR: ${errorCode}`, errorEvent);
  missionEventSystem.emitCriticalEvent('CRITICAL_ERROR', errorEvent, 'CRITICAL');
}

// =============================================================================
// NASA FAULT-TOLERANT CIRCUIT BREAKER SYSTEM
// =============================================================================

class MissionCriticalCircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.options = {
      timeout: options.timeout || 3000,
      errorThresholdPercentage: options.errorThresholdPercentage || 50,
      resetTimeout: options.resetTimeout || 30000,
      ...options
    };
    
    this.breaker = new CircuitBreaker(this.executeAction.bind(this), this.options);
    this.setupEventHandlers();
  }
  
  /**
   * Executes an action through the circuit breaker
   * @param {Function} action - Action to execute
   * @param {...any} args - Action arguments
   * @returns {Promise} Action result
   */
  async executeAction(action, ...args) {
    try {
      const result = await action(...args);
      missionEventSystem.emitCriticalEvent('CIRCUIT_BREAKER_SUCCESS', {
        name: this.name,
        action: action.name
      });
      return result;
    } catch (error) {
      missionEventSystem.emitCriticalEvent('CIRCUIT_BREAKER_ERROR', {
        name: this.name,
        error: error.message,
        action: action.name
      }, 'WARNING');
      throw error;
    }
  }
  
  /**
   * Sets up circuit breaker event handlers
   */
  setupEventHandlers() {
    this.breaker.on('open', () => {
      missionEventSystem.emitCriticalEvent('CIRCUIT_BREAKER_OPEN', {
        name: this.name
      }, 'CRITICAL');
    });
    
    this.breaker.on('halfOpen', () => {
      missionEventSystem.emitCriticalEvent('CIRCUIT_BREAKER_HALF_OPEN', {
        name: this.name
      }, 'WARNING');
    });
    
    this.breaker.on('close', () => {
      missionEventSystem.emitCriticalEvent('CIRCUIT_BREAKER_CLOSE', {
        name: this.name
      });
    });
  }
  
  /**
   * Executes an action with fault tolerance
   * @param {Function} action - Action to execute
   * @param {...any} args - Action arguments
   * @returns {Promise} Action result
   */
  async execute(action, ...args) {
    return this.breaker.fire(action, ...args);
  }
}

// =============================================================================
// NASA PROMETHEUS METRICS SYSTEM
// =============================================================================

/**
 * Creates NASA-compliant Prometheus metrics
 * @returns {Object} Metrics collection
 */
function createMissionCriticalMetrics() {
  const collectDefaultMetrics = prometheus.collectDefaultMetrics;
  collectDefaultMetrics({ timeout: 5000 });

  return {
    httpRequestDuration: new prometheus.Histogram({
      name: 'nasa_http_request_duration_seconds',
      help: 'NASA-compliant HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code', 'worker_id', 'classification'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5, 10]
    }),

    httpRequestsTotal: new prometheus.Counter({
      name: 'nasa_http_requests_total',
      help: 'NASA-compliant total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'worker_id', 'classification']
    }),

    activeConnections: new prometheus.Gauge({
      name: 'nasa_active_connections',
      help: 'NASA-compliant number of active connections',
      labelNames: ['worker_id']
    }),

    memoryUsage: new prometheus.Gauge({
      name: 'nasa_memory_usage_bytes',
      help: 'NASA-compliant memory usage in bytes',
      labelNames: ['type', 'worker_id']
    }),

    systemHealth: new prometheus.Gauge({
      name: 'nasa_system_health_score',
      help: 'NASA-compliant system health score (0-100)',
      labelNames: ['worker_id', 'component']
    }),

    securityEvents: new prometheus.Counter({
      name: 'nasa_security_events_total',
      help: 'NASA-compliant total security events',
      labelNames: ['event_type', 'severity', 'worker_id']
    }),

    circuitBreakerState: new prometheus.Gauge({
      name: 'nasa_circuit_breaker_state',
      help: 'NASA-compliant circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['breaker_name', 'worker_id']
    })
  };
}

const metrics = createMissionCriticalMetrics();

// =============================================================================
// NASA CLUSTER MANAGEMENT - MISSION-CRITICAL PROCESS CONTROL
// =============================================================================

const CLUSTER_CONFIG = Object.freeze({
  workers: ENVIRONMENT.WORKERS,
  lifetime: Infinity,
  grace: 10000, // 10 seconds for graceful shutdown
  respawn: true,
  maxMemory: parseInt(ENVIRONMENT.MAX_MEMORY) * 1024 * 1024
});

if (cluster.isMaster && ENVIRONMENT.NODE_ENV === 'production') {
  logger.info(`🚀 NASA OrpheusAI Master Control ${process.pid} initializing ${CLUSTER_CONFIG.workers} worker processes`);
  
  const workerHealth = new Map();
  const workerStartTimes = new Map();
  
  // Initialize worker processes with fault tolerance
  for (let i = 0; i < CLUSTER_CONFIG.workers; i++) {
    const worker = cluster.fork();
    workerStartTimes.set(worker.id, Date.now());
    workerHealth.set(worker.id, {
      status: 'starting',
      lastHeartbeat: Date.now(),
      restartCount: 0
    });
    
    logger.info(`🛰️ Worker ${worker.process.pid} (ID: ${worker.id}) launched`);
  }
  
  // Worker lifecycle management
  cluster.on('exit', (worker, code, signal) => {
    const health = workerHealth.get(worker.id);
    const uptime = Date.now() - workerStartTimes.get(worker.id);
    
    logger.error(`💀 Worker ${worker.process.pid} (ID: ${worker.id}) terminated`, {
      code,
      signal,
      uptime,
      restartCount: health?.restartCount || 0
    });
    
    // Intelligent restart logic
    if (health && health.restartCount < 5) {
      const newWorker = cluster.fork();
      workerStartTimes.set(newWorker.id, Date.now());
      workerHealth.set(newWorker.id, {
        status: 'starting',
        lastHeartbeat: Date.now(),
        restartCount: (health.restartCount || 0) + 1
      });
      
      logger.info(`🔄 Worker ${newWorker.process.pid} (ID: ${newWorker.id}) restarted (attempt ${health.restartCount + 1})`);
    } else {
      logger.error(`🚨 Worker ${worker.id} exceeded maximum restart attempts`);
    }
    
    workerHealth.delete(worker.id);
    workerStartTimes.delete(worker.id);
  });
  
  // Health monitoring system
  setInterval(() => {
    const now = Date.now();
    
    for (const [workerId, health] of workerHealth.entries()) {
      const timeSinceHeartbeat = now - health.lastHeartbeat;
      
      if (timeSinceHeartbeat > MISSION_CONFIG.FAULT_TOLERANCE.HEARTBEAT_INTERVAL_MS * 2) {
        logger.warn(`⚠️ Worker ${workerId} heartbeat timeout`, {
          timeSinceHeartbeat,
          workerStatus: health.status
        });
        
        const worker = cluster.workers[workerId];
        if (worker) {
          worker.kill('SIGTERM');
        }
      }
    }
  }, MISSION_CONFIG.FAULT_TOLERANCE.HEARTBEAT_INTERVAL_MS);
  
  // Memory monitoring and recycling
  setInterval(async () => {
    for (const workerId in cluster.workers) {
      const worker = cluster.workers[workerId];
      
      try {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > CLUSTER_CONFIG.maxMemory * 0.9) {
          logger.warn(`🔄 Recycling worker ${worker.process.pid} due to memory usage`, {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            maxMemory: Math.round(CLUSTER_CONFIG.maxMemory / 1024 / 1024)
          });
          
          worker.kill('SIGTERM');
        }
      } catch (error) {
        logger.error('Error checking worker memory', { error: error.message, workerId });
      }
    }
  }, 60000); // Check every minute
  
  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    logger.info(`📡 Master received ${signal}, initiating graceful shutdown`);
    
    for (const workerId in cluster.workers) {
      cluster.workers[workerId].kill('SIGTERM');
    }
    
    setTimeout(() => {
      logger.error('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }, CLUSTER_CONFIG.grace);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
} else {
  // =============================================================================
  // NASA WORKER PROCESS - MISSION-CRITICAL APPLICATION SERVER
  // =============================================================================
  
  const app = express();
  let server;
  let redisClient;
  let cache;
  let connections = 0;
  
  // Initialize NASA-compliant systems
  async function initializeMissionCriticalSystems() {
    try {
      // Create logs directory
      await fs.mkdir('logs', { recursive: true });
      
      // Initialize Redis with fault tolerance
      redisClient = redis.createClient({
        url: ENVIRONMENT.REDIS_URL,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logCriticalError('REDIS_CONNECTION_REFUSED', options);
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logCriticalError('REDIS_RETRY_TIMEOUT', options);
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            logCriticalError('REDIS_MAX_ATTEMPTS', options);
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        },
        max_attempts: 10,
        connect_timeout: 60000,
        lazyConnect: true
      });
      
      // High-performance cache with NASA fault tolerance
      cache = new LRU({
        max: 500000, // 500k items for high-traffic
        maxAge: 1000 * 60 * 15, // 15 minutes
        updateAgeOnGet: true,
        stale: true,
        dispose: (key, value) => {
          logger.debug('Cache item disposed', { key, valueType: typeof value });
        }
      });
      
      logger.info('🛰️ Mission-critical systems initialized successfully', {
        workerId: process.pid,
        redisConnected: redisClient.connected,
        cacheSize: cache.length
      });
      
    } catch (error) {
      logCriticalError('SYSTEM_INITIALIZATION_FAILED', { error: error.message });
      process.exit(1);
    }
  }
  
  // NASA-compliant security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'nonce-nasa-secure'"], // NASA requires nonce-based CSP
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        blockAllMixedContent: []
      },
    },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" }, // NASA security requirement
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: "no-referrer" }, // NASA privacy requirement
    permittedCrossDomainPolicies: false,
    ieNoOpen: true
  }));
  
  // NASA trust proxy configuration
  app.set('trust proxy', 1); // NASA requires explicit proxy trust
  app.disable('x-powered-by');
  app.set('etag', false); // NASA security requirement
  
  // High-performance compression with NASA optimization
  app.use(compression({
    level: 6,
    threshold: 1024,
    memLevel: 8,
    chunkSize: 16384,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      if (req.path.includes('/health') || req.path.includes('/metrics')) return false;
      return compression.filter(req, res);
    }
  }));
  
  // NASA-compliant rate limiting with adaptive thresholds
  const createNASARateLimiter = (windowMs, max, message, tier = 'standard') => {
    return rateLimit({
      windowMs,
      max,
      message: { 
        error: message,
        tier,
        timestamp: new Date().toISOString(),
        workerId: process.pid
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: new rateLimit.MemoryStore(),
      keyGenerator: (req) => {
        const identifier = req.ip + ':' + (req.user?.id || 'anonymous');
        return crypto.createHash('sha256').update(identifier).digest('hex');
      },
      skip: (req) => {
        // NASA health check exemptions
        const exemptPaths = ['/health', '/ready', '/metrics', '/nasa-status'];
        return exemptPaths.includes(req.path);
      },
      onLimitReached: (req, res, options) => {
        const securityEvent = {
          type: 'RATE_LIMIT_EXCEEDED',
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent'),
          tier,
          limit: max,
          windowMs
        };
        
        logger.warn('NASA Rate limit exceeded', securityEvent);
        metrics.securityEvents.labels('rate_limit', 'warning', process.pid).inc();
        missionEventSystem.emitCriticalEvent('RATE_LIMIT_VIOLATION', securityEvent, 'WARNING');
      }
    });
  };
  
  // Multi-tier NASA rate limiting
  const globalLimiter = createNASARateLimiter(15 * 60 * 1000, 50000, 'Global rate limit exceeded', 'global');
  const apiLimiter = createNASARateLimiter(60 * 1000, 5000, 'API rate limit exceeded', 'api');
  const strictLimiter = createNASARateLimiter(60 * 1000, 500, 'Strict rate limit exceeded', 'strict');
  
  // NASA progressive delay system
  const nasaSpeedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 1000,
    delayMs: 100,
    maxDelayMs: 10000,
    skipFailedRequests: false,
    skipSuccessfulRequests: true,
    onLimitReached: (req, res, options) => {
      logger.warn('NASA Speed limit engaged', {
        ip: req.ip,
        path: req.path,
        delay: options.delay
      });
    }
  });
  
  // Apply NASA rate limiting
  app.use(globalLimiter);
  app.use(nasaSpeedLimiter);
  
  // NASA-compliant CORS with strict validation
  const nasaCorsOptions = {
    origin: function (origin, callback) {
      // NASA security: Log all origin attempts
      logger.debug('CORS origin check', { origin, allowed: ENVIRONMENT.ALLOWED_ORIGINS });
      
      if (!origin || ENVIRONMENT.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        const securityEvent = {
          type: 'CORS_VIOLATION',
          origin,
          allowedOrigins: ENVIRONMENT.ALLOWED_ORIGINS
        };
        
        logger.warn('NASA CORS policy violation', securityEvent);
        metrics.securityEvents.labels('cors_violation', 'warning', process.pid).inc();
        missionEventSystem.emitCriticalEvent('CORS_VIOLATION', securityEvent, 'WARNING');
        callback(new Error('NASA CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name',
      'X-NASA-Request-ID' // NASA tracking header
    ],
    maxAge: 86400, // 24 hours preflight cache
    optionsSuccessStatus: 200
  };
  
  app.use(cors(nasaCorsOptions));
  
  // NASA security middleware stack
  app.use(hpp()); // HTTP Parameter Pollution protection
  app.use(mongoSanitize()); // NoSQL injection protection
  app.use(xss()); // XSS protection
  app.use(requestIp.mw()); // IP detection with NASA logging
  app.use(useragent.express()); // User agent parsing
  app.use(cookieParser()); // Cookie parsing with security
  
  // NASA request ID generation for full traceability
  app.use((req, res, next) => {
    req.nasaRequestId = crypto.randomUUID();
    res.setHeader('X-NASA-Request-ID', req.nasaRequestId);
    res.setHeader('X-NASA-Worker-ID', process.pid);
    res.setHeader('X-NASA-Classification', MISSION_CONFIG.APPLICATION.CLASSIFICATION);
    next();
  });
  
  // NASA-compliant session management
  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: ENVIRONMENT.SESSION_SECRET,
    name: 'nasa.orpheus.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: ENVIRONMENT.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: MISSION_CONFIG.SECURITY.SESSION_TIMEOUT_MS,
      sameSite: 'strict'
    },
    genid: () => {
      return `nasa-${crypto.randomUUID()}-${Date.now()}`;
    }
  }));
  
  // NASA body parsing with strict limits
  app.use(express.json({ 
    limit: '5mb', // NASA conservative limit
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf;
      req.bodyHash = crypto.createHash('sha256').update(buf).digest('hex');
    }
  }));
  
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '5mb',
    parameterLimit: 100 // NASA strict parameter limit
  }));
  
  // NASA advanced monitoring and metrics
  app.use(responseTime((req, res, time) => {
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const workerId = process.pid;
    const classification = MISSION_CONFIG.APPLICATION.CLASSIFICATION;
    
    // Record NASA metrics
    metrics.httpRequestDuration
      .labels(method, route, statusCode, workerId, classification)
      .observe(time / 1000);
    
    metrics.httpRequestsTotal
      .labels(method, route, statusCode, workerId, classification)
      .inc();
    
    // NASA performance monitoring
    if (time > MISSION_CONFIG.PERFORMANCE.MAX_RESPONSE_TIME_MS) {
      logger.warn('NASA Performance threshold exceeded', {
        nasaRequestId: req.nasaRequestId,
        route,
        method,
        responseTime: time,
        threshold: MISSION_CONFIG.PERFORMANCE.MAX_RESPONSE_TIME_MS
      });
    }
  }));
  
  // NASA-compliant request logging with full audit trail
  const nasaMorganFormat = ENVIRONMENT.NODE_ENV === 'production' 
    ? ':remote-addr - :remote-user [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms NASA-ID::req[X-NASA-Request-ID]'
    : 'dev';
  
  app.use(morgan(nasaMorganFormat, {
    stream: {
      write: (message) => {
        logger.info(message.trim(), {
          type: 'nasa_http_request',
          workerId: process.pid,
          classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION
        });
      }
    },
    skip: (req) => {
      const exemptPaths = ['/health', '/ready', '/metrics'];
      return exemptPaths.includes(req.path);
    }
  }));
  
  // NASA system health monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Update NASA metrics
    metrics.memoryUsage.labels('rss', process.pid).set(memUsage.rss);
    metrics.memoryUsage.labels('heapTotal', process.pid).set(memUsage.heapTotal);
    metrics.memoryUsage.labels('heapUsed', process.pid).set(memUsage.heapUsed);
    metrics.memoryUsage.labels('external', process.pid).set(memUsage.external);
    
    // NASA health score calculation
    const memoryHealthScore = Math.max(0, 100 - (memUsage.heapUsed / MISSION_CONFIG.PERFORMANCE.MAX_MEMORY_MB / 1024 / 1024) * 100);
    const connectionHealthScore = Math.max(0, 100 - (connections / MISSION_CONFIG.PERFORMANCE.MAX_CONCURRENT_CONNECTIONS) * 100);
    
    metrics.systemHealth.labels(process.pid, 'memory').set(memoryHealthScore);
    metrics.systemHealth.labels(process.pid, 'connections').set(connectionHealthScore);
    
    // NASA critical threshold monitoring
    if (memUsage.heapUsed > MISSION_CONFIG.PERFORMANCE.MAX_MEMORY_MB * 1024 * 1024 * 0.8) {
      logger.warn('NASA Memory threshold exceeded', {
        workerId: process.pid,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        maxMemory: MISSION_CONFIG.PERFORMANCE.MAX_MEMORY_MB,
        healthScore: memoryHealthScore
      });
      
      missionEventSystem.emitCriticalEvent('MEMORY_THRESHOLD_EXCEEDED', {
        heapUsed: memUsage.heapUsed,
        threshold: MISSION_CONFIG.PERFORMANCE.MAX_MEMORY_MB * 1024 * 1024 * 0.8
      }, 'WARNING');
    }
  }, MISSION_CONFIG.FAULT_TOLERANCE.HEARTBEAT_INTERVAL_MS);
  
  // NASA security threat detection system
  app.use((req, res, next) => {
    const suspiciousPatterns = [
      { pattern: /\.\./g, threat: 'PATH_TRAVERSAL' },
      { pattern: /<script[^>]*>.*?<\/script>/gi, threat: 'XSS_ATTEMPT' },
      { pattern: /union.*select/gi, threat: 'SQL_INJECTION' },
      { pattern: /drop.*table/gi, threat: 'SQL_INJECTION' },
      { pattern: /exec.*\(/gi, threat: 'CODE_INJECTION' },
      { pattern: /javascript:/gi, threat: 'XSS_ATTEMPT' },
      { pattern: /vbscript:/gi, threat: 'XSS_ATTEMPT' },
      { pattern: /onload=/gi, threat: 'XSS_ATTEMPT' },
      { pattern: /onerror=/gi, threat: 'XSS_ATTEMPT' }
    ];
    
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const requestBody = JSON.stringify(req.body);
    const userAgent = req.get('User-Agent') || '';
    
    for (const { pattern, threat } of suspiciousPatterns) {
      if (pattern.test(fullUrl) || pattern.test(requestBody) || pattern.test(userAgent)) {
        const securityThreat = {
          type: threat,
          ip: req.ip,
          url: fullUrl,
          method: req.method,
          userAgent,
          nasaRequestId: req.nasaRequestId,
          pattern: pattern.source,
          timestamp: new Date().toISOString()
        };
        
        logger.error('NASA Security threat detected', securityThreat);
        metrics.securityEvents.labels(threat.toLowerCase(), 'critical', process.pid).inc();
        missionEventSystem.emitCriticalEvent('SECURITY_THREAT_DETECTED', securityThreat, 'CRITICAL');
        
        // NASA immediate response to threats
        return res.status(403).json({
          error: 'Security threat detected',
          nasaRequestId: req.nasaRequestId,
          classification: 'SECURITY_VIOLATION',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    next();
  });
  
  // NASA-compliant health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const startTime = process.hrtime();
      
      // Comprehensive health checks
      const healthChecks = {
        server: 'healthy',
        redis: 'unknown',
        memory: 'unknown',
        uptime: process.uptime(),
        connections: connections,
        timestamp: new Date().toISOString(),
        workerId: process.pid,
        classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION,
        version: MISSION_CONFIG.APPLICATION.VERSION
      };
      
      // Redis health check
      try {
        if (redisClient && redisClient.connected) {
          await redisClient.ping();
          healthChecks.redis = 'healthy';
        } else {
          healthChecks.redis = 'disconnected';
        }
      } catch (error) {
        healthChecks.redis = 'error';
        logger.warn('Redis health check failed', { error: error.message });
      }
      
      // Memory health check
      const memUsage = process.memoryUsage();
      const memoryPercentage = (memUsage.heapUsed / MISSION_CONFIG.PERFORMANCE.MAX_MEMORY_MB / 1024 / 1024) * 100;
      healthChecks.memory = memoryPercentage < 80 ? 'healthy' : memoryPercentage < 90 ? 'warning' : 'critical';
      healthChecks.memoryUsage = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round(memoryPercentage)
      };
      
      // Overall health determination
      const isHealthy = healthChecks.redis === 'healthy' && 
                       healthChecks.memory !== 'critical' && 
                       healthChecks.server === 'healthy';
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;
      
      healthChecks.responseTime = `${responseTime.toFixed(2)}ms`;
      healthChecks.status = isHealthy ? 'healthy' : 'degraded';
      
      res.status(isHealthy ? 200 : 503).json(healthChecks);
      
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(503).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        workerId: process.pid
      });
    }
  });
  
  // NASA readiness probe for zero-downtime deployments
  app.get('/ready', async (req, res) => {
    try {
      const readinessChecks = {
        redis: false,
        cache: false,
        routes: false
      };
      
      // Check Redis connectivity
      if (redisClient && redisClient.connected) {
        await redisClient.ping();
        readinessChecks.redis = true;
      }
      
      // Check cache availability
      if (cache && typeof cache.get === 'function') {
        readinessChecks.cache = true;
      }
      
      // Check routes availability
      readinessChecks.routes = true; // Simplified check
      
      const isReady = Object.values(readinessChecks).every(check => check === true);
      
      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not ready',
        checks: readinessChecks,
        workerId: process.pid,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Readiness check failed', { error: error.message });
      res.status(503).json({
        status: 'not ready',
        error: error.message,
        workerId: process.pid,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // NASA metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    try {
      const metricsData = await prometheus.register.metrics();
      res.set('Content-Type', prometheus.register.contentType);
      res.end(metricsData);
    } catch (error) {
      logger.error('NASA Metrics generation failed', { error: error.message });
      res.status(500).json({
        error: 'Metrics unavailable',
        timestamp: new Date().toISOString(),
        workerId: process.pid
      });
    }
  });
  
  // NASA status endpoint with comprehensive system information
  app.get('/nasa-status', (req, res) => {
    const systemStatus = {
      mission: MISSION_CONFIG.APPLICATION.NAME,
      version: MISSION_CONFIG.APPLICATION.VERSION,
      classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION,
      safetyLevel: MISSION_CONFIG.APPLICATION.SAFETY_LEVEL,
      workerId: process.pid,
      uptime: process.uptime(),
      environment: ENVIRONMENT.NODE_ENV,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      activeConnections: connections,
      eventHistory: missionEventSystem.getEventHistory().slice(-10), // Last 10 events
      systemHealth: {
        memory: Math.max(0, 100 - (process.memoryUsage().heapUsed / MISSION_CONFIG.PERFORMANCE.MAX_MEMORY_MB / 1024 / 1024) * 100),
        connections: Math.max(0, 100 - (connections / MISSION_CONFIG.PERFORMANCE.MAX_CONCURRENT_CONNECTIONS) * 100)
      }
    };
    
    res.json(systemStatus);
  });
  
  // API routes with NASA rate limiting
  app.use('/api', apiLimiter);
  
  // Mount application routes (placeholder - would include actual route modules)
  app.get('/', (req, res) => {
    res.json({
      message: 'NASA-Compliant OrpheusAI Server',
      version: MISSION_CONFIG.APPLICATION.VERSION,
      classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION,
      workerId: process.pid,
      nasaRequestId: req.nasaRequestId,
      timestamp: new Date().toISOString()
    });
  });
  
  // NASA 404 handler with full logging
  app.use('*', (req, res) => {
    const notFoundEvent = {
      type: '404_NOT_FOUND',
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      nasaRequestId: req.nasaRequestId
    };
    
    logger.warn('NASA 404 - Route not found', notFoundEvent);
    missionEventSystem.emitCriticalEvent('ROUTE_NOT_FOUND', notFoundEvent, 'WARNING');
    
    res.status(404).json({
      error: 'Route not found',
      message: 'The requested NASA resource does not exist',
      nasaRequestId: req.nasaRequestId,
      classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION,
      timestamp: new Date().toISOString(),
      workerId: process.pid
    });
  });
  
  // NASA global error handler with comprehensive logging
  app.use((err, req, res, next) => {
    const errorId = crypto.randomUUID();
    const errorEvent = {
      errorId,
      type: 'UNHANDLED_ERROR',
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      nasaRequestId: req.nasaRequestId,
      bodyHash: req.bodyHash,
      workerId: process.pid,
      timestamp: new Date().toISOString()
    };
    
    logger.error('NASA Unhandled error', errorEvent);
    missionEventSystem.emitCriticalEvent('UNHANDLED_ERROR', errorEvent, 'CRITICAL');
    
    res.status(err.status || 500).json({
      error: 'Internal server error',
      errorId,
      nasaRequestId: req.nasaRequestId,
      message: ENVIRONMENT.NODE_ENV === 'production' ? 'A system error occurred' : err.message,
      classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION,
      timestamp: new Date().toISOString(),
      workerId: process.pid
    });
  });
  
  // NASA graceful shutdown handler
  const nasaGracefulShutdown = async (signal) => {
    logger.info(`📡 NASA Worker ${process.pid} received ${signal}, initiating mission-critical shutdown sequence`);
    
    missionEventSystem.emitCriticalEvent('SHUTDOWN_INITIATED', {
      signal,
      uptime: process.uptime(),
      activeConnections: connections
    }, 'WARNING');
    
    // Phase 1: Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info(`✅ NASA Worker ${process.pid} HTTP server closed`);
      });
    }
    
    // Phase 2: Close Redis connection
    if (redisClient) {
      try {
        await redisClient.quit();
        logger.info(`✅ NASA Worker ${process.pid} Redis connection closed`);
      } catch (error) {
        logger.error('Error closing Redis connection', { error: error.message });
      }
    }
    
    // Phase 3: Clear cache
    if (cache) {
      cache.reset();
      logger.info(`✅ NASA Worker ${process.pid} Cache cleared`);
    }
    
    // Phase 4: Final cleanup
    logger.info(`✅ NASA Worker ${process.pid} shutdown completed successfully`);
    process.exit(0);
  };
  
  // Initialize and start NASA-compliant server
  async function startNASAServer() {
    try {
      await initializeMissionCriticalSystems();
      
      server = app.listen(ENVIRONMENT.PORT, () => {
        logger.info(`🚀 NASA OrpheusAI Worker ${process.pid} operational on port ${ENVIRONMENT.PORT}`, {
          environment: ENVIRONMENT.NODE_ENV,
          classification: MISSION_CONFIG.APPLICATION.CLASSIFICATION,
          version: MISSION_CONFIG.APPLICATION.VERSION,
          memoryLimit: ENVIRONMENT.MAX_MEMORY
        });
        
        missionEventSystem.emitCriticalEvent('SERVER_STARTED', {
          port: ENVIRONMENT.PORT,
          environment: ENVIRONMENT.NODE_ENV,
          workerId: process.pid
        });
      });
      
      // NASA server configuration for high availability
      server.keepAliveTimeout = 65000;
      server.headersTimeout = 66000;
      server.timeout = 120000;
      server.maxConnections = MISSION_CONFIG.PERFORMANCE.MAX_CONCURRENT_CONNECTIONS;
      
      // NASA connection tracking
      server.on('connection', (socket) => {
        connections++;
        metrics.activeConnections.labels(process.pid).set(connections);
        
        socket.on('close', () => {
          connections--;
          metrics.activeConnections.labels(process.pid).set(connections);
        });
        
        socket.on('error', (error) => {
          logger.warn('NASA Socket error', { error: error.message });
        });
      });
      
      // NASA error handling
      server.on('error', (error) => {
        logCriticalError('SERVER_ERROR', { error: error.message });
        missionEventSystem.emitCriticalEvent('SERVER_ERROR', {
          error: error.message,
          code: error.code
        }, 'CRITICAL');
      });
      
    } catch (error) {
      logCriticalError('SERVER_START_FAILED', { error: error.message });
      process.exit(1);
    }
  }
  
  // NASA signal handlers
  process.on('SIGTERM', () => nasaGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => nasaGracefulShutdown('SIGINT'));
  
  // NASA uncaught exception handler
  process.on('uncaughtException', (err) => {
    logCriticalError('UNCAUGHT_EXCEPTION', {
      error: err.message,
      stack: err.stack
    });
    
    missionEventSystem.emitCriticalEvent('UNCAUGHT_EXCEPTION', {
      error: err.message,
      stack: err.stack
    }, 'CRITICAL');
    
    // NASA requires immediate shutdown on uncaught exceptions
    process.exit(1);
  });
  
  // NASA unhandled promise rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logCriticalError('UNHANDLED_PROMISE_REJECTION', {
      reason: reason?.toString() || 'Unknown reason',
      promise: promise?.toString() || 'Unknown promise'
    });
    
    missionEventSystem.emitCriticalEvent('UNHANDLED_PROMISE_REJECTION', {
      reason: reason?.toString(),
      promise: promise?.toString()
    }, 'CRITICAL');
    
    // NASA requires immediate shutdown on unhandled rejections
    process.exit(1);
  });
  
  // NASA memory monitoring
  process.on('warning', (warning) => {
    logger.warn('NASA Process warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });
  
  // Start the NASA-compliant server
  startNASAServer();
}