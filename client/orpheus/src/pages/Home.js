import React, { useState, useRef, useEffect } from 'react';
import { Loader, Send, Paperclip, X, File, Image, FileText, Video, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import './styles/home.css';
import './styles/onboarding.css';

const Home = () => {
  const [inputValue, setInputValue] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:3000'; // or your backend URL

  //Backend call
  const sendMessageToBackend = async (prompt, file = null, conversationHistory = []) => {
    try {
      setIsLoading(true);
  
      // Prepare form data for multipart/form-data request
      const formData = new FormData();
      formData.append('message', prompt || '');
      formData.append('conversationHistory', JSON.stringify(conversationHistory));
      
      // Add user data (get from sessionStorage or state)
      const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
      formData.append('userData', JSON.stringify(userData));
      
      // Add file if present
      if (file) {
        formData.append('file', file);
      }
  
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/send`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );
  
      if (response.data.success) {
        const aiResponse = response.data.response;
        
        // Prepare current message parts for display
        let currentParts = [];
        if (prompt && prompt.trim()) {
          currentParts.push({ text: prompt });
        }
        
        // Navigate to chat with complete conversation data
        navigate('/chat', { 
          state: { 
            messages: [...messages, 
              { 
                role: 'user', 
                parts: currentParts,
                timestamp: Date.now(),
                hasFile: !!file,
                fileName: file?.name
              },
              { 
                role: 'assistant', // Fixed typo: was 'assistent'
                parts: [{ text: aiResponse }],
                timestamp: Date.now(),
                aiSource: response.data.aiSource // Track which AI was used
              }
            ]
          } 
        });
      } else {
        throw new Error(response.data.error || 'Failed to get AI response');
      }
      
    } catch (error) {
      console.error('Backend API Error:', error.response?.data || error.message);
      alert(`Error: ${error.response?.data?.message || error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  // Check if file type is supported by Gemini
  const isSupportedFileType = (fileType) => {
    const supportedTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/x-javascript',
      'text/x-typescript', 'application/x-typescript', 'text/csv', 'text/markdown', 'text/x-python',
      'application/x-python-code', 'application/json', 'text/xml', 'application/rtf',
      'text/rtf', 'application/pdf'
    ];
    return supportedTypes.includes(fileType);
  };

  // Checking if its first login
  useEffect(() => {
    let loginState = sessionStorage.getItem('orpheus_onboarding_completed');
    if (!loginState) navigate('/');
    else if (loginState !== 'true') navigate('/');
    else if (loginState === 'true') navigate('/home');
    else navigate('/');
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [inputValue]);

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image size={20} />;
    if (fileType.startsWith('video/')) return <Video size={20} />;
    if (fileType.startsWith('audio/')) return <Music size={20} />;
    if (fileType.includes('text/') || fileType.includes('document')) return <FileText size={20} />;
    return <File size={20} />;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Optional: Add file size check
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      
      setAttachedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() || attachedFile) {
      // Convert current messages to conversation history format
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts
      }));
      
      // Call backend instead of direct API
      sendMessageToBackend(inputValue.trim(), attachedFile, conversationHistory);
      
      setInputValue('');
      setAttachedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <Loader className="spin" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="wizz-container">
      <Sidebar />

      <div className="wizz-main">
        <p className='header-top-text'>OrpheusAI</p>
        <div className="main-content">
          <div className="logo-container">
            <h1 className="logo">How Can I help you today?</h1>
          </div>

          <div className="input-container">
            {attachedFile && (
              <div className="file-preview">
                <div className="file-info">
                  {filePreview ? (
                    <img 
                      src={filePreview} 
                      alt="File preview" 
                      className="file-preview-image"
                    />
                  ) : (
                    <div className="file-icon">
                      {getFileIcon(attachedFile.type)}
                    </div>
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-name">{attachedFile.name}</div>
                    <div style={{ fontSize: '12px', color: '#888888', marginTop: '2px' }}>
                      {formatFileSize(attachedFile.size)}
                      {!isSupportedFileType(attachedFile.type) && (
                        <span style={{ color: '#ff6b6b', marginLeft: '8px' }}>
                          (Unsupported format)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    className="remove-file-btn"
                    onClick={removeFile}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="input-form">
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask anything..."
                  className="main-input"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                
                <div className="input-actions">
                  <button
                    type="button"
                    className="action-btn attach-btn"
                    onClick={triggerFileInput}
                  >
                    <Paperclip size={18} />
                  </button>
                  
                  <button
                    type="button"
                    className="action-btn submit-btn"
                    disabled={!inputValue.trim() && !attachedFile}
                    onClick={handleSubmit}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden-file-input"
              accept="*/*"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;