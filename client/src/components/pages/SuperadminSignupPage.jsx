import React, { useState } from 'react';
import signupService from '../../services/signupService';
import Sidebar from '../Sidebar';
import './PageLayout.css';
import Toast from '../ui/Toast';

const SuperadminSignupPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    businessName: '',
    businessLogo: '',
    businessDetails: {
      displayName: '',
      description: '',
      website: '',
      supportEmail: '',
      supportPhone: '',
      address: '',
      gstin: ''
    }
  });

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.name || !formData.email || !formData.password || !formData.businessName) {
        throw new Error('Please fill all required fields');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      const result = await signupService.signup(formData);
      setSuccess('User registered successfully!');
      setToast({ message: 'User registered successfully!', type: 'success' });

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        businessName: '',
        businessLogo: '',
        businessDetails: {
          displayName: '',
          description: '',
          website: '',
          supportEmail: '',
          supportPhone: '',
          address: '',
          gstin: ''
        }
      });
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>User Registration</h1>
          <p>Create merchant/admin accounts with complete business details</p>
        </div>
        
        <div className="page-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <div className="create-form-card">
            <h3>Register New User</h3>
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-section">
                <h4>Basic Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      placeholder="Rajesh Kumar"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      placeholder="rajesh@electronics.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                      placeholder="SecurePass123"
                    />
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      required
                    >
                      <option value="admin">Admin</option>
                      <option value="superAdmin">Super Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Business Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Business Name *</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      required
                      placeholder="Rajesh Electronics"
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Logo URL</label>
                    <input
                      type="url"
                      value={formData.businessLogo}
                      onChange={(e) => handleInputChange('businessLogo', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Business Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Display Name</label>
                    <input
                      type="text"
                      value={formData.businessDetails.displayName}
                      onChange={(e) => handleInputChange('businessDetails.displayName', e.target.value)}
                      placeholder="Rajesh Electronics - Your Trusted Partner"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={formData.businessDetails.description}
                      onChange={(e) => handleInputChange('businessDetails.description', e.target.value)}
                      placeholder="Best electronics store in Pune"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      value={formData.businessDetails.website}
                      onChange={(e) => handleInputChange('businessDetails.website', e.target.value)}
                      placeholder="https://rajeshelectronics.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Support Email</label>
                    <input
                      type="email"
                      value={formData.businessDetails.supportEmail}
                      onChange={(e) => handleInputChange('businessDetails.supportEmail', e.target.value)}
                      placeholder="support@rajeshelectronics.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Support Phone</label>
                    <input
                      type="tel"
                      value={formData.businessDetails.supportPhone}
                      onChange={(e) => handleInputChange('businessDetails.supportPhone', e.target.value)}
                      placeholder="9876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      value={formData.businessDetails.gstin}
                      onChange={(e) => handleInputChange('businessDetails.gstin', e.target.value)}
                      placeholder="27AABCU9603R1ZM"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    value={formData.businessDetails.address}
                    onChange={(e) => handleInputChange('businessDetails.address', e.target.value)}
                    placeholder="123 MG Road, Pune, Maharashtra 411001"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="primary-btn">
                  {loading ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast({ message: '', type: 'success' })}
          />
        </div>
      </main>
    </div>
  );
};

export default SuperadminSignupPage;
