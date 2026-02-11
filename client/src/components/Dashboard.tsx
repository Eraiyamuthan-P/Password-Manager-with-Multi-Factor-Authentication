// client/src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { passwordAPI, Password, Stats } from '../utils/api';
// ...existing code...
import PasswordModal from './PasswordModal';
import PasswordItem from './PasswordItem';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, vaultKey, logout } = useAuth();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<Password | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPasswords();
    fetchStats();
  }, []);

  // Re-fetch passwords when vaultKey changes (e.g., after face auth login)
  useEffect(() => {
    if (vaultKey) {
      fetchPasswords();
      fetchStats();
    }
  }, [vaultKey]);

  const fetchPasswords = async () => {
    try {
      setLoading(true);
      const response = await passwordAPI.getAll();
      setPasswords(response.data.passwords);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await passwordAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddPassword = () => {
    setSelectedPassword(null);
    setShowModal(true);
  };

  const handleEditPassword = (password: Password) => {
    setSelectedPassword(password);
    setShowModal(true);
  };

  const handleDeletePassword = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this password?')) return;

    try {
      await passwordAPI.delete(id);
      fetchPasswords();
      fetchStats();
    } catch (error) {
      console.error('Error deleting password:', error);
    }
  };

  const handleModalClose = (refresh: boolean) => {
    setShowModal(false);
    setSelectedPassword(null);
    if (refresh) {
      fetchPasswords();
      fetchStats();
    }
  };

  const filteredPasswords = passwords.filter((pwd) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'weak' && pwd.securityScore < 50) ||
      (filter === 'breached' && pwd.breached) ||
      (filter !== 'all' && filter !== 'weak' && filter !== 'breached' && pwd.category === filter);

    const matchesSearch = pwd.website.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen app-bg-neutral">
      {/* Header Surface */}
      <header className="header-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-2.5 icon-bubble rounded-xl">
                <svg className="small-icon text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Password Manager</h1>
                <p className="text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/settings')}
                className="btn-base btn-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
              <button
                onClick={logout}
                className="btn-base btn-danger"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stat-card stat-blue animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Total Items</p>
                  <p className="value">{stats.total}</p>
                </div>
                <div className="p-2.5 icon-bubble rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="stat-card stat-green animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Security Score</p>
                  <p className="value">{stats.averageSecurityScore}%</p>
                </div>
                <div className="p-2.5 icon-bubble rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="stat-card stat-yellow animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Weak Passwords</p>
                  <p className="value">{stats.weak}</p>
                </div>
                <div className="p-2.5 icon-bubble rounded-xl">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="stat-card stat-red animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Compromised</p>
                  <p className="value">{stats.breached}</p>
                </div>
                <div className="p-2.5 icon-bubble rounded-xl">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search passwords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-gray-600 font-medium">Filter:</span>
              {['all', 'weak', 'breached', 'social', 'banking', 'email', 'work'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`filter-pill ${filter === f ? 'active' : ''}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Add Password Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleAddPassword}
            className="btn-base btn-primary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="ml-2">Add Password</span>
          </button>
        </div>

        {/* Password List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading your vault...</p>
            </div>
          ) : filteredPasswords.length === 0 ? (
            <div className="empty-surface">
              <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchTerm || filter !== 'all' ? 'No passwords found' : 'Your vault is empty'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Start securing your passwords by adding your first one!'}
              </p>
            </div>
          ) : (
            <div>
              {filteredPasswords.map((password) => (
                <PasswordItem
                  key={password._id}
                  password={password}
                  vaultKey={vaultKey!}
                  onEdit={handleEditPassword}
                  onDelete={handleDeletePassword}
                  onRefresh={() => {
                    fetchPasswords();
                    fetchStats();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showModal && (
        <PasswordModal
          password={selectedPassword}
          vaultKey={vaultKey!}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Dashboard;