import React, { useState, useEffect, useRef, } from 'react';
import { 
  User, 
  MapPin,  
  Droplet, 
  AlertTriangle,  
  X, 
  Plus,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader
} from 'lucide-react';
import './styles/onboarding.css';
import {useNavigate } from 'react-router-dom';


const OnboardingModal = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();


  //Checking if its first login
  useEffect(()=>{
    let loginState = sessionStorage.getItem('orpheus_onboarding_completed')
    if(!loginState) navigate('/')
    else if (loginState !== 'true') navigate('/')
    else if (loginState === 'true') navigate('/home')
    else navigate('/')
  },[])
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    zipCode: '',
    location: { lat: null, lng: null, address: '' },
    bloodGroup: '',
    gender: '',
    allergies: [],
    medications: []
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const allergyInputRef = useRef(null);
  const medicationInputRef = useRef(null);

  const totalSteps = 4;
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    return '';
  };

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return 'Phone number is required';
    if (cleanPhone.length !== 10) return 'Phone number must be 10 digits';
    if (!/^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanPhone)) return 'Invalid US phone number format';
    return'';
  };

  const validateZipCode = (zipCode) => {
    if (!zipCode.trim()) return 'ZIP code is required';
    if (!/^\d{5}(-\d{4})?$/.test(zipCode.trim())) return 'Invalid ZIP code format (e.g., 12345 or 12345-6789)';
    return '';
  };

  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');
    const phoneNumberLength = phoneNumber.length;
    
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      fetchLocation();
    }
  }, [isOpen]);

  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported');
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding to get address
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        location: {
          lat: latitude,
          lng: longitude,
          address: `${data.city}, ${data.principalSubdivision}`
        },
        zipCode: data.postcode || ''
      }));
    } catch (error) {
      console.error('Location fetch failed:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    let processedValue = value;
    
    // Format phone number as user types
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };


  const validateCurrentStep = () => {
    const newErrors = {};
    
    switch (currentStep) {
      case 1:
        const nameError = validateName(formData.name);
        const phoneError = validatePhone(formData.phone);
        if (nameError) newErrors.name = nameError;
        if (phoneError) newErrors.phone = phoneError;
        break;
      case 2:
        const zipError = validateZipCode(formData.zipCode);
        if (zipError) newErrors.zipCode = zipError;
        break;
      case 3:
        if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== allergy)
    }));
  };

  const addMedication = () => {
    const trimmed = newMedication.trim();
    if (!trimmed) return;
    
    if (formData.medications.includes(trimmed)) {
      setErrors(prev => ({ ...prev, medication: 'Medication already added' }));
      return;
    }
    
    if (trimmed.length < 2) {
      setErrors(prev => ({ ...prev, medication: 'Medication must be at least 2 characters' }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, trimmed]
    }));
    setNewMedication('');
    setErrors(prev => ({ ...prev, medication: '' }));
  };

  const removeMedication = (medication) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter(m => m !== medication)
    }));
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Store onboarding completion flag
    sessionStorage.setItem('orpheus_onboarding_completed', 'true');
    sessionStorage.setItem('userData', JSON.stringify(formData));
    
    setIsLoading(false);
    onComplete(formData);
    navigate('/home')
  };


// Form Validation
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && formData.phone.trim();
      case 2:
        return formData.zipCode.trim();
      case 3:
        return formData.bloodGroup && formData.gender;
      case 4:
        return true;
      default:
        return false;
    }
  };

  

  if (!isOpen) return null;

  return (
    <div className={`onboarding-overlay ${isVisible ? 'visible' : ''}`}>
      <div className={`onboarding-modal ${isVisible ? 'visible' : ''}`}>

        <div className="onboarding-header">
          <h2 className="onboarding-title">
            Welcome to <span className="brand-accent">OrpheusAI</span>
          </h2>
          <p className="onboarding-subtitle">
            Let's personalize your experience with some basic information
          </p>
          
          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            <span className="progress-text">{currentStep} of {totalSteps}</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="onboarding-content">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="step-content active">
              <div className="step-header">
                <User className="step-icon" size={24} />
                <h3>Basic Information</h3>
              </div>
              
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  maxLength={50}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  maxLength={14}
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
                <span className="form-hint">US residents only</span>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="step-content active">
              <div className="step-header">
                <MapPin className="step-icon" size={24} />
                <h3>Location Information</h3>
              </div>

              <div className={`location-status ${locationLoading ? 'location-loading' : formData.location.address ? 'location-found' : 'location-error'}`}>
                {locationLoading ? (
                  <>
                    <Loader className="spin" size={20} />
                    <span>Fetching your location...</span>
                  </>
                ) : formData.location.address ? (
                  <>
                    <Check size={20} />
                    <span>{formData.location.address}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} />
                    <span>Unable to fetch location automatically</span>
                  </>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="zipCode">ZIP Code *</label>
                <input
                  id="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  placeholder="12345 or 12345-6789"
                  className={`form-input ${errors.zipCode ? 'error' : ''}`}
                  maxLength={10}
                />
                {errors.zipCode && <span className="error-message">{errors.zipCode}</span>}
              </div>
            </div>
          )}

          {/* Step 3: Medical Info */}
          {currentStep === 3 && (
            <div className="step-content active">
              <div className="step-header">
                <Droplet className="step-icon" size={24} />
                <h3>Medical Information</h3>
              </div>

              <div className="form-group">
                <label>Blood Group *</label>
                <div className="select-grid">
                  {bloodGroups.map(group => (
                    <button
                      key={group}
                      type="button"
                      className={`select-option ${formData.bloodGroup === group ? 'selected' : ''}`}
                      onClick={() => handleInputChange('bloodGroup', group)}
                    >
                      {group}
                    </button>
                  ))}
                </div>
                {errors.bloodGroup && <span className="error-message">{errors.bloodGroup}</span>}
              </div>

              <div className="form-group">
                <label>Gender *</label>
                <div className="select-grid">
                  {genders.map(gender => (
                    <button
                      key={gender}
                      type="button"
                      className={`select-option ${formData.gender === gender ? 'selected' : ''}`}
                      onClick={() => handleInputChange('gender', gender)}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
                {errors.gender && <span className="error-message">{errors.gender}</span>}
              </div>
            </div>
          )}

          {/* Step 4: Health Details */}
          {currentStep === 4 && (
            <div className="step-content active">
              <div className="step-header">
                <AlertTriangle className="step-icon" size={24} />
                <h3>Health Details</h3>
              </div>

              <div className="form-group">
                <label htmlFor="allergy-input">Allergies</label>
                <div className="list-input">
                  <input
                    id="allergy-input"
                    ref={allergyInputRef}
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Enter allergy"
                    className={`form-input ${errors.allergy ? 'error' : ''}`}
                    onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                    maxLength={30}
                  />
                  <button 
                    type="button" 
                    className="add-btn" 
                    onClick={addAllergy}
                    disabled={!newAllergy.trim()}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {errors.allergy && <span className="error-message">{errors.allergy}</span>}
                
                <div className="tag-list">
                  {formData.allergies.map(allergy => (
                    <div key={allergy} className="tag">
                      <span>{allergy}</span>
                      <button onClick={() => removeAllergy(allergy)} aria-label={`Remove ${allergy}`}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="medication-input">Current Medications</label>
                <div className="list-input">
                  <input
                    id="medication-input"
                    ref={medicationInputRef}
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="Enter medication"
                    className={`form-input ${errors.medication ? 'error' : ''}`}
                    onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                    maxLength={30}
                  />
                  <button 
                    type="button" 
                    className="add-btn" 
                    onClick={addMedication}
                    disabled={!newMedication.trim()}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {errors.medication && <span className="error-message">{errors.medication}</span>}
                
                <div className="tag-list">
                  {formData.medications.map(medication => (
                    <div key={medication} className="tag">
                      <span>{medication}</span>
                      <button onClick={() => removeMedication(medication)} aria-label={`Remove ${medication}`}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="onboarding-footer">
          <button 
            className="nav-btn secondary" 
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          {currentStep < totalSteps ? (
            <button 
              className="nav-btn primary" 
              onClick={nextStep}
              disabled={!isStepValid()}
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              className="nav-btn primary complete-btn" 
              onClick={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="spin" size={18} />
                  Completing...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <p className='credit-footer'>Powered by Gemini and Perplexity AI</p>
    </div>
  );
};

// Main component that handles onboarding logic
const OnboardingWrapper = ({ children }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('orpheus_onboarding_completed');
    
    // Simulate checking for auth token or user session
    setTimeout(() => {
      setShowOnboarding(!hasCompletedOnboarding);
      setIsLoading(false)
    }, 500);
  }, []);

  const handleOnboardingComplete = (userData) => {
    setShowOnboarding(false);
    if (userData) {
      console.log('Onboarding completed with data:', userData);
    }
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
    <>
      {children}
      <OnboardingModal 
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
};

export default OnboardingWrapper;