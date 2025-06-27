import React, { useState, useRef, useEffect } from 'react';
import { useLocation} from 'react-router-dom';
import { Send, Paperclip, X, File, Image, FileText, Video, Music, User, Bot, Loader, Copy, Flag, Check, Globe, Zap } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import './styles/chat.css'

// Typewriter effect component with scroll trigger
const TypewriterText = ({ text, speed = 40, onComplete, onProgress }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        // Trigger scroll on each character
        if (onProgress) onProgress();
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, onProgress]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className="typewriter-text">
      {displayedText}
      {currentIndex < text.length && <span className="cursor">|</span>}
    </div>
  );
};

// Format AI response text - FIXED image handling
const formatAIResponse = (text) => {
  if (!text) return '';
  
  // Split text into lines to handle formatting better
  let lines = text.split('\n');
  let formatted = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle headers first (ensure they're on their own lines)
    if (line.match(/^###\s+(.+)$/)) {
      formatted += `<h3>${line.replace(/^###\s+/, '')}</h3>\n`;
    } else if (line.match(/^##\s+(.+)$/)) {
      formatted += `<h2>${line.replace(/^##\s+/, '')}</h2>\n`;
    } else if (line.match(/^#\s+(.+)$/)) {
      formatted += `<h1>${line.replace(/^#\s+/, '')}</h1>\n`;
    } else {
      formatted += line + '\n';
    }
  }
  
  // Now handle other formatting
  formatted = formatted
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Unordered lists
    .replace(/^\* (.+$)/gim, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+$)/gim, '<li>$1</li>')
    // Handle links with proper formatting [text](url) - BEFORE image processing
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // IMPROVED: More comprehensive image URL detection with working domains
  const workingImageDomains = [
    'unsplash.com',
    'pexels.com',
    'pixabay.com',
    'wikimedia.org',
    'commons.wikimedia.org',
    'upload.wikimedia.org',
    'i.imgur.com',
    'github.com',
    'githubusercontent.com'
  ];

  // Look for image URLs that are likely to work
  const imageRegex = new RegExp(
    `https?:\\/\\/(?:www\\.)?(${workingImageDomains.join('|').replace(/\./g, '\\.')})[\\/\\w\\-._~:/?#[\\]@!$&'()*+,;=]*\\.(jpg|jpeg|png|gif|webp|svg)(?:\\?[^\\s]*)?`,
    'gi'
  );

  // Find all potential image URLs
  const potentialImages = [];
  let match;
  while ((match = imageRegex.exec(formatted)) !== null) {
    potentialImages.push(match[0]);
  }

  // Remove duplicates and filter out likely broken URLs
  const validImages = [...new Set(potentialImages)].filter(url => {
    // Skip URLs that are likely to be broken or placeholder
    return !url.includes('example.com') && 
           !url.includes('placeholder') && 
           !url.includes('via.placeholder');
  });
  
  if (validImages.length > 0) {
    // Remove image URLs from text
    validImages.forEach(img => {
      const standaloneImageRegex = new RegExp(`(?<!\\(|href="|src=")${img.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![^<]*>)`, 'g');
      formatted = formatted.replace(standaloneImageRegex, '');
    });
    
    // Create image grid with better error handling and fallback
    let imageGrid = '<div class="image-grid">';
    validImages.forEach((img, index) => {
      imageGrid += `
        <div class="image-container" style="margin: 5px; display: inline-block;">
          <img src="${img}" 
               alt="Image ${index + 1}" 
               loading="lazy"
               onclick="window.open('${img}', '_blank')" 
               onerror="this.parentElement.innerHTML='<div class=\\"broken-image\\">Image unavailable</div>'"
               style="max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #ddd;" />
        </div>`;
    });
    imageGrid += '</div>';
    
    formatted = imageGrid + formatted;
  }
  
  // Handle non-image URLs
  const urlRegex = /(?<!href="|src="|<a[^>]*>)https?:\/\/(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+(?:\/[^\s<>"{}|\\^`[\]]*)?(?![^<]*<\/a>)(?!\.(jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)/gi;
  
  formatted = formatted.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  
  // Handle lists properly
  formatted = formatted.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => {
    if (formatted.includes('1.') || formatted.includes('2.')) {
      return `<ol>${match}</ol>`;
    } else {
      return `<ul>${match}</ul>`;
    }
  });
  
  // Handle line breaks and paragraphs
  formatted = formatted
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags if needed
  if (!formatted.includes('<h1>') && !formatted.includes('<h2>') && !formatted.includes('<h3>') && 
      !formatted.includes('<p>') && !formatted.includes('<ul>') && !formatted.includes('<ol>')) {
    formatted = `<p>${formatted}</p>`;
  }

  return formatted;
};

// Message component with action buttons and scroll callback
const Message = ({ message, isTyping = false, onTypingProgress, aiSource }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.parts[0].text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const reportMessage = () => {
    setReported(true);
    setTimeout(() => setReported(false), 2000);
    console.log('Message reported:', message.parts[0].text);
  };
  
  return (
    <div className={`message ${isUser ? 'user-message' : 'ai-message'}`}>
      <div className="message-avatar">
        {isUser ? (
          <User size={16} />
        ) : (
          <div style={{ position: 'relative' }}>
            <Bot size={16} />
            {aiSource && (
              <div style={{ 
                position: 'absolute', 
                top: -4, 
                right: -4, 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: aiSource === 'perplexity' ? '#20B2AA' : '#4285F4' 
              }} title={aiSource === 'perplexity' ? 'Real-time search' : 'General AI'} />
            )}
          </div>
        )}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">
            {isUser ? 'You' : 'Orpheus'}
            {!isUser && aiSource && (
              <span className="ai-source-badge" style={{ 
                marginLeft: '8px', 
                fontSize: '11px', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                backgroundColor: aiSource === 'perplexity' ? '#20B2AA20' : '#4285F420',
                color: aiSource === 'perplexity' ? '#20B2AA' : '#4285F4',
                border: `1px solid ${aiSource === 'perplexity' ? '#20B2AA40' : '#4285F440'}`
              }}>
                {aiSource === 'perplexity' ? (
                  <>
                    <Globe size={8} style={{ marginRight: '2px' }} />
                    Live
                  </>
                ) : (
                  <>
                    <Zap size={8} style={{ marginRight: '2px' }} />
                    AI
                  </>
                )}
              </span>
            )}
          </span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="message-text">
          {message.hasFile && (
            <div className="message-file-indicator">
              <File size={14} />
              <span>Attached: {message.fileName}</span>
            </div>
          )}
          {isTyping && !isUser ? (
            <TypewriterText 
              text={message.parts[0].text} 
              speed={15} 
              onProgress={onTypingProgress}
            />
          ) : isUser ? (
            <div className="user-text-bubble">{message.parts[0].text}</div>
          ) : (
            <div 
              className="ai-formatted-text"
              dangerouslySetInnerHTML={{ __html: formatAIResponse(message.parts[0].text) }}
            />
          )}
        </div>
        
        {/* Action buttons for AI messages */}
        {!isUser && !isTyping && (
          <div className="message-actions">
            <button 
              className="action-icon-btn" 
              onClick={copyToClipboard}
              title="Copy response"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button 
              className="action-icon-btn" 
              onClick={reportMessage}
              title="Report response"
            >
              <Flag size={14} color={reported ? '#ff6b6b' : undefined} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Chat() {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [currentAiSource, setCurrentAiSource] = useState(null);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  

  

  // Enhanced storage functions
  const saveMessagesToStorage = (msgs) => {
    try {
      const dataToSave = {
        messages: msgs,
        timestamp: Date.now(),
        hasTyped: msgs.map(msg => ({ id: msg.id || Date.now(), hasFinishedTyping: true }))
      };
      sessionStorage.setItem('chatMessages', JSON.stringify(dataToSave));
      sessionStorage.setItem('chatLoadedFromStorage', 'true');
    } catch (error) {
      console.error('Failed to save messages to storage:', error);
    }
  };

  const loadMessagesFromStorage = () => {
    try {
      const savedData = sessionStorage.getItem('chatMessages');
      const hasLoaded = sessionStorage.getItem('chatLoadedFromStorage') === 'true';
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        return {
          messages: parsedData.messages || [],
          hasLoadedBefore: hasLoaded,
          typingStates: parsedData.hasTyped || []
        };
      }
      return { messages: [], hasLoadedBefore: false, typingStates: [] };
    } catch (error) {
      console.error('Failed to load messages from storage:', error);
      return { messages: [], hasLoadedBefore: false, typingStates: [] };
    }
  };

  // auto-scroll
  const scrollToBottom = (behavior = 'smooth', force = false) => {
    if (messagesEndRef.current && chatContainerRef.current) {
      const chatContainer = chatContainerRef.current;
      const scrollHeight = chatContainer.scrollHeight;
      const clientHeight = chatContainer.clientHeight;
      const scrollTop = chatContainer.scrollTop;
      
      // Check if user has scrolled up (unless forced)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (force || isNearBottom) {
        chatContainer.scrollTo({
          top: scrollHeight,
          behavior: behavior
        });
      }
    }
  };

  // Handle typing progress for continuous scrolling
  const handleTypingProgress = () => {
    scrollToBottom('auto', true);
  };

  // Initialize messages from storage or location state
  useEffect(() => {
    const { messages: savedMessages, hasLoadedBefore } = loadMessagesFromStorage();
    
    if (location.state?.messages && !hasLoadedBefore) {
      setMessages(location.state.messages);
      saveMessagesToStorage(location.state.messages);
      setHasLoadedFromStorage(true);
    } else if (savedMessages.length > 0) {
      setMessages(savedMessages);
      setHasLoadedFromStorage(true);
    }
  }, [location.state]);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0 && hasLoadedFromStorage) {
      saveMessagesToStorage(messages);
    }
  }, [messages, hasLoadedFromStorage]);

  // Auto-scroll when messages change
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom('smooth', true), 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 100;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [inputValue]);

  

  const isSupportedFileType = (fileType) => {
    const supportedTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm',
      'video/wmv', 'video/3gp',
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json',
      'application/pdf', 'application/rtf',
      'text/x-typescript', 'text/x-python', 'text/x-java', 'text/x-c', 'text/x-cpp',
      'text/x-csharp', 'text/x-php', 'text/x-ruby', 'text/x-go', 'text/x-rust',
      'text/x-swift', 'text/x-kotlin', 'text/x-scala', 'text/x-r', 'text/x-sql',
      'text/xml', 'application/xml', 'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return supportedTypes.includes(fileType);
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image size={16} />;
    if (fileType.startsWith('video/')) return <Video size={16} />;
    if (fileType.startsWith('audio/')) return <Music size={16} />;
    return <FileText size={16} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File handling
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setAttachedFile(file);
    
    const preview = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      isSupported: isSupportedFileType(file.type)
    };

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.url = e.target.result;
        setFilePreview(preview);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(preview);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to call Perplexity API
const callBackendAPI = async (query, conversationHistory, currentFile = null) => {
  const formData = new FormData();
  formData.append('message', query.trim());
  formData.append('conversationHistory', JSON.stringify(conversationHistory));
  
  // Get user data from session storage
  const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
  formData.append('userData', JSON.stringify(userData));
  
  // Add file if present=
  if (currentFile) {
    formData.append('file', currentFile);
  }

  const response = await fetch('http://localhost:3000/api/chat/send', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    response: data.response,
    aiSource: data.aiSource
  };
};

  // Send message with AI routing
  const sendMessage = async () => {
    if (!inputValue.trim() && !attachedFile) return;
    if (isLoading) return;

    const messageText = inputValue.trim();
    const userMessage = {
      role: 'user',
      parts: [{ text: messageText }],
      timestamp: new Date().toISOString(),
      hasFile: !!attachedFile,
      fileName: attachedFile?.name
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    
    const currentFile = attachedFile;
    removeFile();

    try {
      // Call backend API
      const result = await callBackendAPI(messageText, messages, currentFile);
      
      // Create AI response message
      const aiMessage = {
        role: 'model',
        parts: [{ text: result.response }],
        timestamp: new Date().toISOString(),
        aiSource: result.aiSource
      };
    
      // Add AI message and trigger typing effect
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(true);
      
      // Stop typing after animation completes
      setTimeout(() => {
        setIsTyping(false);
        setCurrentAiSource(null);
      }, result.response.length * 15 + 1000);
    
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create error message
      const errorMessage = {
        role: 'model',
        parts: [{ 
          text: `I apologize, but I encountered an error while processing your request. ${
            error.message?.includes('API') ? 'Please check your internet connection and try again.' : 
            error.message?.includes('file') ? 'There was an issue processing your file.' :
            'Please try again in a moment.'
          }` 
        }],
        timestamp: new Date().toISOString(),
        aiSource: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setCurrentAiSource(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <Sidebar />
      
      <div className="chat-main" ref={chatContainerRef}>
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <Bot size={48} />
              <h3>Welcome to OrpheusAI</h3>
              <p>Your civic assistant for Indianapolis city services and information. How can I help you today?</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isCurrentlyTyping = isTyping && index === messages.length - 1 && message.role === 'model';
              return (
                <Message
                  key={index}
                  message={message}
                  isTyping={isCurrentlyTyping}
                  onTypingProgress={handleTypingProgress}
                  aiSource={message.aiSource}
                />
              );
            })
          )}
          
          {/* Loading indicator */}
          {isLoading && !isTyping && (
            <div className="message ai-message loading-message">
              <div className="message-avatar">
                <Bot size={16} />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">
                    Orpheus
                    {currentAiSource && (
                      <span className="ai-source-badge" style={{ 
                        marginLeft: '8px', 
                        fontSize: '11px', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        backgroundColor: currentAiSource === 'perplexity' ? '#20B2AA20' : '#4285F420',
                        color: currentAiSource === 'perplexity' ? '#20B2AA' : '#4285F4',
                        border: `1px solid ${currentAiSource === 'perplexity' ? '#20B2AA40' : '#4285F440'}`
                      }}>
                        {currentAiSource === 'perplexity' ? (
                          <>
                            <Globe size={8} style={{ marginRight: '2px' }} />
                            Live
                          </>
                        ) : (
                          <>
                            <Zap size={8} style={{ marginRight: '2px' }} />
                            AI
                          </>
                        )}
                      </span>
                    )}
                  </span>
                </div>
                <div className="message-text">
                  <div className="typing-indicator">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Input Area */}
        <div className="chat-input-area">
          {/* File Preview */}
          {filePreview && (
            <div className="file-preview">
              <div className="file-info">
                {filePreview.url ? (
                  <img 
                    src={filePreview.url} 
                    alt="File preview" 
                    className="file-preview-image"
                  />
                ) : (
                  <div className="file-icon">
                    {getFileIcon(filePreview.type)}
                  </div>
                )}
                <div className="file-details">
                  <div className="file-name">
                    {filePreview.name}
                    {!filePreview.isSupported && (
                      <span className="unsupported-format"> (Unsupported format)</span>
                    )}
                  </div>
                  <div className="file-size">{filePreview.size}</div>
                </div>
                <button className="remove-file-btn" onClick={removeFile}>
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Input Container */}
          <div className="floating-input-container">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="main-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Indianapolis city services, permits, utilities..."
                rows={1}
                disabled={isLoading}
              />
              
              <div className="input-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden-file-input"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,audio/*,text/*,.pdf,.doc,.docx,.csv,.json"
                />
                
                <button
                  className="action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                
                <button
                  className={`action-btn submit-btn ${isLoading ? 'loading' : ''}`}
                  onClick={sendMessage}
                  disabled={(!inputValue.trim() && !attachedFile) || isLoading}
                  title="Send message"
                >
                  {isLoading ? (
                    <Loader size={18} className="spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}