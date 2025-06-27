const express = require('express');
const multer = require('multer');
const axios = require('axios');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB field size limit
  },
  fileFilter: (req, file, cb) => {
    // Define supported file types
    const supportedTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 
      'video/webm', 'video/wmv', 'video/3gp',
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json',
      'application/pdf', 'application/rtf',
      'text/x-typescript', 'text/x-python', 'text/x-java', 'text/x-c', 'text/x-cpp',
      'text/x-csharp', 'text/x-php', 'text/x-ruby', 'text/x-go', 'text/x-rust',
      'text/x-swift', 'text/x-kotlin', 'text/x-scala', 'text/x-r', 'text/x-sql',
      'text/xml', 'application/xml', 'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (supportedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// API Configuration
const GOOGLE_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMMA_3_27B_MODEL = 'models/gemma-3-27b-it';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Validate API keys on startup
if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY is not set in environment variables');
}
if (!PERPLEXITY_API_KEY) {
  console.error('❌ PERPLEXITY_API_KEY is not set in environment variables');
}

// Utility functions
const determineAiSource = (query) => {
  const realTimeKeywords = [
    'news', 'breaking', 'latest', 'recent', 'today', 'yesterday', 'this week', 'current events',
    'happening now', 'live', 'update', 'announcement', 'press release',
    'weather', 'temperature', 'rain', 'snow', 'forecast', 'climate', 'storm', 'hurricane',
    'sunny', 'cloudy', 'wind', 'humidity',
    'verify', 'fact check', 'is it true', 'confirm', 'validate', 'check if', 'real or fake',
    'stock price', 'market', 'trading', 'nasdaq', 'dow jones', 'cryptocurrency', 'bitcoin',
    'score', 'game result', 'match', 'tournament', 'championship', 'playoffs',
    'traffic', 'road conditions', 'accident', 'construction', 'transit', 'flight status',
    'right now', 'at this moment', 'currently', 'as of today', 'real time', 'live data',
    'status', 'availability', 'open now', 'closed', 'hours of operation',
    'upcoming', 'this year','this month', 'next week', 'next day', 'as of now',
    'tomorrow'
  ];

  const queryLower = query.toLowerCase();
  const needsRealTimeInfo = realTimeKeywords.some(keyword => 
    queryLower.includes(keyword)
  );
  
  const timeSensitivePatterns = [
    /what.*(happened|happening).*today/i,
    /latest.*on/i,
    /current.*status/i,
    /is.*open.*now/i,
    /weather.*in/i,
    /news.*about/i,
    /stock.*price/i,
    /verify.*that/i,
    /fact.*check/i
  ];
  
  const hasTimeSensitivePattern = timeSensitivePatterns.some(pattern => 
    pattern.test(query)
  );
  
  return needsRealTimeInfo || hasTimeSensitivePattern ? 'perplexity' : 'gemini';
};

const getSystemPrompt = (conversationHistory = [], userData = {}) => {
  const contextHistory = conversationHistory.length > 0 
    ? conversationHistory.slice(-6).map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts[0].text}`
      ).join('\n')
    : '';

  return `You are **Orpheus**, a specialized civic assistant for Indianapolis, Indiana residents. You help with city services, public information, and civic duties.

**PRIMARY FOCUS**: Indianapolis city services, government, public utilities, civic engagement, local resources, and community information.

**USER INFORMATION**:
- Name: ${userData.name}
- Location: ${userData.zipCode}, Indiana
- Phone: ${userData.phone}
- Blood Group: ${userData.bloodGroup}
- Gender: ${userData.gender}

**CONVERSATION CONTEXT**:
${contextHistory}

**YOUR ROLE**:
- Help with Indianapolis city services (permits, utilities, trash collection, etc.)
- Provide information about local government, city council, mayor's office
- Assist with civic duties (voting, jury duty, taxes, etc.)
- Share resources for Indianapolis residents (libraries, parks, public transportation)
- Guide users to appropriate city departments and services
- Answer questions about Indianapolis neighborhoods, zip codes, and local areas

**INTERACTION GUIDELINES**:
- Keep responses concise (1-3 sentences) unless detailed explanation is needed
- Always personalize responses using the user's information when relevant
- For casual conversation, be friendly but steer back to civic topics when appropriate
- If asked about non-Indianapolis topics, politely redirect to local civic matters
- Provide specific Indianapolis department contact information when relevant
- Include relevant website links for city services when helpful

**RESPONSE STYLE**:
- Professional yet friendly tone
- Factual and helpful
- Include actionable steps when possible
- Reference specific Indianapolis services and departments

Remember: You specialize in Indianapolis civic services and public information. For general topics, provide brief responses and offer to help with Indianapolis-specific civic matters instead.`;
};

const fileToBase64 = (buffer) => {
  return buffer.toString('base64');
};

// API calling functions
const callPerplexityAPI = async (query, conversationHistory, userData) => {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API key not configured');
  }

  const cleanedHistory = conversationHistory
    .slice(-5)
    .filter(msg => msg && msg.parts && msg.parts[0] && msg.parts[0].text)
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.parts[0].text.trim()
    }));

  const messages = [
    {
      role: "system",
      content: getSystemPrompt(conversationHistory, userData) + 
        "\n\nIMPORTANT: You have access to real-time information and web search. Provide current, accurate, and up-to-date information. Always cite your sources when providing recent information. And remeber every info is personalised for Indianapolis, Indiana"
    },
    ...cleanedHistory,
    {
      role: "user",
      content: query.trim()
    }
  ];

  try {
    const response = await axios.post(PERPLEXITY_API_URL, {
      model: "llama-3.1-sonar-small-128k-online",
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Perplexity API error:', error.response?.data || error.message);
    throw new Error(`Perplexity API error: ${error.response?.status || error.message}`);
  }
};

const callGeminiAPI = async (query, conversationHistory, userData, fileData = null) => {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }
  
    const cleanedHistory = conversationHistory
      .slice(-5)
      .filter(msg => msg && msg.parts && msg.parts[0] && msg.parts[0].text)
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.parts[0].text.trim() }]
      }));
  
    const userParts = [{ text: query.trim() }];
  
    // Add file if provided
    if (fileData) {
      userParts.push({
        inline_data: {
          mime_type: fileData.mimeType,
          data: fileData.base64Data
        }
      });
    }
  
    // For Gemma, add system prompt as first message if no history exists
    const contents = [];
    
    if (cleanedHistory.length === 0) {
      // Add system prompt as first user message for Gemma
      contents.push({
        role: 'user',
        parts: [{ text: getSystemPrompt(conversationHistory, userData) }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: "I understand. I'm Orpheus, your Indianapolis civic assistant. How can I help you with city services or civic matters today?" }]
      });
    }
    
    // Add conversation history
    contents.push(...cleanedHistory);
    
    // Add current user message
    contents.push({
      role: 'user',
      parts: userParts
    });
  
    const requestBody = {
      contents: contents,
      // Remove systemInstruction - not supported by Gemma
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
  
    try {
      const response = await axios.post(
        `${GOOGLE_AI_BASE_URL}/${GEMMA_3_27B_MODEL}:generateContent?key=${GOOGLE_API_KEY}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
  
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error(`Gemini API error: ${error.response?.status || error.message}`);
    }
  };

// Send message route
router.post('/send', upload.single('file'), async (req, res) => {
  try {
    const { message, conversationHistory, userData } = req.body;
    
    // Validate required fields
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string'
      });
    }

    // Parse JSON fields
    let parsedHistory = [];
    let parsedUserData = {};
    
    try {
      parsedHistory = conversationHistory ? JSON.parse(conversationHistory) : [];
      parsedUserData = userData ? JSON.parse(userData) : {};
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid JSON in conversationHistory or userData'
      });
    }

    // Validate conversation history format
    if (!Array.isArray(parsedHistory)) {
      return res.status(400).json({
        error: 'conversationHistory must be an array'
      });
    }

    // Handle file data if present
    let fileData = null;
    if (req.file) {
      fileData = {
        base64Data: fileToBase64(req.file.buffer),
        mimeType: req.file.mimetype
      };
    }

    // Determine AI source
    const aiSource = determineAiSource(message);
    let aiResponse;
    let actualSource = aiSource;

    try {
      if (aiSource === 'perplexity') {
        try {
          aiResponse = await callPerplexityAPI(message, parsedHistory, parsedUserData);
        } catch (perplexityError) {
          console.warn('Perplexity failed, falling back to Gemini:', perplexityError.message);
          aiResponse = await callGeminiAPI(message, parsedHistory, parsedUserData, fileData);
          actualSource = 'gemini';
        }
      } else {
        aiResponse = await callGeminiAPI(message, parsedHistory, parsedUserData, fileData);
      }

      // Return successful response
      res.json({
        success: true,
        response: aiResponse,
        aiSource: actualSource,
        timestamp: new Date().toISOString()
      });

    } catch (apiError) {
      console.error('API call failed:', apiError);
      res.status(500).json({
        error: 'Failed to generate AI response',
        message: apiError.message,
        aiSource: actualSource
      });
    }

  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  }
});

// File upload route (for testing file uploads independently)
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const fileInfo = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      sizeFormatted: formatFileSize(req.file.size)
    };

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      error: 'File upload failed',
      message: error.message
    });
  }
});

// Utility function for file size formatting
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Chat API is working',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /api/chat/send - Send a message to AI',
      'POST /api/chat/upload - Upload a file',
      'GET /api/chat/test - This test endpoint'
    ]
  });
});

module.exports = router;