// client/src/components/Settings.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [message, setMessage] = useState('');

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      const response = await authAPI.setup2FA();
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setShowSetup(true);
      setMessage('');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setLoading(true);
      await authAPI.verify2FA(verifyToken);
      setMessage('2FA enabled successfully! Please logout and login again.');
      setShowSetup(false);
      setQrCode('');
      setSecret('');
      setVerifyToken('');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA?')) return;
    try {
      setLoading(true);
      await authAPI.disable2FA();
      setMessage('2FA disabled successfully!');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setMessage('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const toggleFaceAuth = async () => {
    setLoading(true);
    try {
      if (user?.faceAuthEnabled) {
        await authAPI.disableFaceAuth();
        alert('Face auth disabled');
      } else {
        navigate('/face-enroll');
      }
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.message || 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-bg-neutral">
      <header className="header-surface">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="icon-bubble bg-blue-100">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Account Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-900 mb-2">Account</h2>
                <p className="text-sm text-gray-600 break-words">{user?.email}</p>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Face Authentication</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${user?.faceAuthEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user?.faceAuthEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Two-Factor Auth</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${user?.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Status</span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Security Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Face Authentication Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start space-x-3">
                  <div className="icon-bubble bg-blue-50">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      Face Authentication
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {user?.faceAuthEnabled 
                        ? 'Face login is active. Use face recognition for quick and secure access.'
                        : 'Enable biometric login for a faster, password-free experience.'}
                    </p>
                    <button
                      onClick={toggleFaceAuth}
                      disabled={loading}
                      className={`btn-base ${user?.faceAuthEnabled ? 'btn-danger' : 'btn-primary'} disabled:opacity-50`}
                    >
                      {loading ? 'Processing...' : user?.faceAuthEnabled ? 'Disable Face Login' : 'Enable Face Login'}
                    </button>
                    {!user?.faceAuthEnabled && (
                      <p className="text-xs text-gray-500 mt-3 flex items-start space-x-1">
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>You'll scan your face once, then login instantly without typing passwords.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="icon-bubble bg-green-50">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-sm text-gray-600">
                      Add an extra security layer with time-based codes from your authenticator app.
                    </p>
                  </div>
                </div>

                {message && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('successfully') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message}
                  </div>
                )}

                {!user?.twoFactorEnabled && !showSetup && (
                  <button
                    onClick={handleEnable2FA}
                    disabled={loading}
                    className="btn-base btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Enable 2FA'}
                  </button>
                )}

                {user?.twoFactorEnabled && !showSetup && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-3">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-800 font-medium text-sm">2FA is currently active</span>
                    </div>
                    <button
                      onClick={handleDisable2FA}
                      disabled={loading}
                      className="btn-base btn-danger disabled:opacity-50"
                    >
                      {loading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </div>
                )}

                {showSetup && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Complete 2FA Setup</h4>
                    
                    <div className="space-y-4 mb-6">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Step 1: Install Authenticator App</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-700">Google Authenticator</span>
                          <span className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-700">Microsoft Authenticator</span>
                          <span className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-700">Authy</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">Step 2: Scan QR Code</p>
                        {qrCode && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Or manually enter this key:</p>
                        <code className="block bg-white p-3 rounded-lg border border-gray-200 text-xs break-all font-mono text-gray-800">{secret}</code>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Step 3: Enter verification code</p>
                        <input
                          type="text"
                          value={verifyToken}
                          onChange={(e) => setVerifyToken(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleVerify2FA}
                        disabled={loading || verifyToken.length !== 6}
                        className="btn-base btn-primary disabled:opacity-50"
                      >
                        {loading ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                      <button
                        onClick={() => {
                          setShowSetup(false);
                          setVerifyToken('');
                        }}
                        className="btn-base btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back to Dashboard Button - Bottom */}
        <div className="mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-base btn-secondary flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;