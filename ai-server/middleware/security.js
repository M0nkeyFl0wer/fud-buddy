const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const validator = require('validator');

/**
 * Security middleware with comprehensive protection
 */
const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'", 
        "https://api.openai.com",
        "http://localhost:11434", // Local Ollama
        "https://ipinfo.io"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

/**
 * Input validation middleware for chat endpoints
 */
const chatInputValidation = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .custom((value) => {
      // Check for XSS patterns
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          throw new Error('Message contains potentially unsafe content');
        }
      }
      
      return true;
    })
    .customSanitizer((value) => {
      // Sanitize the message
      return validator.escape(value).trim();
    }),
  
  body('chatType')
    .optional()
    .isIn(['whereToGo', 'whatToOrder', 'somethingFun', 'home'])
    .withMessage('Invalid chat type'),
  
  body('previousMessages')
    .optional()
    .isArray()
    .withMessage('Previous messages must be an array')
    .custom((messages) => {
      if (Array.isArray(messages) && messages.length > 50) {
        throw new Error('Too many previous messages');
      }
      return true;
    })
];

/**
 * Error handling middleware for validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));
    
    console.warn('Validation errors:', errorMessages);
    
    return res.status(400).json({
      error: 'Invalid input',
      details: errorMessages,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * Rate limiting with enhanced security
 */
const createRateLimiter = (windowMs = 60000, max = 10) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000),
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Enhanced IP detection
    keyGenerator: (req) => {
      return req.ip || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null);
    },
    // Skip successful requests in count for some endpoints
    skipSuccessfulRequests: false,
    // Skip failed requests in count 
    skipFailedRequests: false,
  });
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  
  // Log suspicious patterns
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nmap/i,
    /masscan/i,
    /burp/i,
    /nikto/i,
    /dirb/i,
    /gobuster/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn(`[SECURITY] Suspicious User-Agent detected: ${userAgent} from ${req.ip}`);
  }
  
  // Log response time on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    
    // Log slow requests
    if (duration > 5000) {
      console.warn(`[PERFORMANCE] Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};

/**
 * Error sanitization middleware
 */
const sanitizeErrors = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sanitizedError = {
    error: isProduction ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { stack: err.stack })
  };
  
  res.status(err.status || 500).json(sanitizedError);
};

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'https://fud-buddy.com',
      'https://app.fud-buddy.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  securityMiddleware,
  chatInputValidation,
  handleValidationErrors,
  createRateLimiter,
  requestLogger,
  sanitizeErrors,
  corsOptions
};