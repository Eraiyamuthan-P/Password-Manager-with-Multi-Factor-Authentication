import React, { useState, useEffect } from 'react';
import { Password, passwordAPI } from '../utils/api';
import CryptoService from '../utils/crypto';

interface PasswordModalProps {
  password: Password | null;
  vaultKey: CryptoKey;
  onClose: (refresh: boolean) => void;
}

interface DecryptedPassword {
  title: string;
  username: string;
  password: string;
  website: string;
  notes: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ password, vaultKey, onClose }) => {
  const [formData, setFormData] = useState<DecryptedPassword>({
    title: '',
    username: '',
    password: '',
    website: '',
    notes: '',
  });
  const [category, setCategory] = useState('other');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, strength: 'weak', feedback: [] as string[] });
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to modal when it opens
    if (modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    const decryptPassword = async () => {
      if (!password) return;
      try {
        const decrypted = await CryptoService.decrypt(password.encryptedData, vaultKey);
        const data = JSON.parse(decrypted);
        setFormData(data);
        setCategory(password.category);
      } catch (error) {
        console.error('Decryption error:', error);
        alert('Error decrypting password');
      }
    };
    if (password) {
      decryptPassword();
    }
  }, [password, vaultKey]);

  useEffect(() => {
    if (formData.password) {
      const strength = CryptoService.calculatePasswordStrength(formData.password);
      setPasswordStrength(strength);
    }
  }, [formData.password]);

  const decryptPassword = async () => {
    if (!password) return;
    
    try {
      const decrypted = await CryptoService.decrypt(password.encryptedData, vaultKey);
      const data = JSON.parse(decrypted);
      setFormData(data);
      setCategory(password.category);
    } catch (error) {
      console.error('Decryption error:', error);
      alert('Error decrypting password');
    }
  };

  const handleGeneratePassword = () => {
    const generated = CryptoService.generatePassword(16);
    setFormData({ ...formData, password: generated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Encrypt data
      const dataToEncrypt = JSON.stringify(formData);
      const encrypted = await CryptoService.encrypt(dataToEncrypt, vaultKey);

      const data = {
        encryptedData: encrypted,
        website: formData.website,
        category,
        securityScore: passwordStrength.score,
      };

      if (password) {
        await passwordAPI.update(password._id, data);
      } else {
        await passwordAPI.create(data);
      }

      onClose(true);
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving password');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.score >= 80) return 'bg-green-500';
    if (passwordStrength.score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {password ? 'Edit Password' : 'Add New Password'}
            </h2>
            <button
              onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="My Account"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Username / Email</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Password *</label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer"
                    style={{ zIndex: 999 }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Strength:</span>
                    <span className={`text-sm font-medium ${passwordStrength.score >= 80 ? 'text-green-600' : passwordStrength.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {passwordStrength.strength.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${getStrengthColor()} h-2 rounded-full transition-all`}
                      style={{ width: `${passwordStrength.score}%` }}
                    ></div>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{passwordStrength.feedback[0]}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="other">Other</option>
                <option value="social">Social Media</option>
                <option value="banking">Banking</option>
                <option value="email">Email</option>
                <option value="work">Work</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Password'}
              </button>
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;
