import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CryptoService from '../utils/crypto';

interface Props {
    onSuccess?: () => void;
}

const FaceAuth: React.FC<Props> = ({ onSuccess }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [masterPassword, setMasterPassword] = useState('');
    const navigate = useNavigate();
    const { refreshAuth } = useAuth(); // ✅ import from context

    useEffect(() => {
        startCamera();
        
        // Cleanup function to stop camera when component unmounts
        return () => {
            stopCamera();
        };
    }, []);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setLoading(false);
        } catch (err) {
            setError('Camera access denied');
            setLoading(false);
        }
    };

    const verify = async () => {
        if (!videoRef.current) return;
        setError('');
        setLoading(true);

        try {
            const video = videoRef.current;
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                setError('Camera not ready. Please wait a moment and try again.');
                setLoading(false);
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg');

            if (!imageData || imageData.length < 100) {
                setError('Failed to capture image. Please try again.');
                setLoading(false);
                return;
            }

            const email = localStorage.getItem('loginEmail');
            if (!email) {
                setError('Email not found. Try logging in again.');
                setLoading(false);
                return;
            }

            console.log('📸 Captured image length:', imageData.length);
            console.log('📧 Using email:', email);

            const res1 = await fetch('http://localhost:5001/api/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData }),
            });

            const result1 = await res1.json();
            console.log('Flask /api/enroll response:', result1);
            if (!res1.ok || !result1.success) throw new Error(result1.error || 'Face extraction failed');

            const faceDescriptor = result1.faceDescriptor;

            const res2 = await fetch('http://localhost:5000/api/auth/face/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, faceDescriptor }),
            });

            const data = await res2.json();
            console.log('Node /face/verify response:', data);

            if (data.success) {
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    if (data.user.salt) localStorage.setItem('salt', data.user.salt);
                }

                console.log("✅ Face verification success — prompting for master password to derive vault key...");
                
                // Stop camera after successful verification
                stopCamera();
                
                setShowPasswordPrompt(true);
                setLoading(false);
            } else {
                setError(data.message || 'Face verification failed.');
            }
        } catch (err: any) {
            console.error('Face verification error:', err);
            setError(err.message || 'Face verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const salt = localStorage.getItem('salt');
            if (!salt) throw new Error('Salt not found. Please log in again.');

            const vaultKey = await CryptoService.deriveMasterKey(masterPassword, salt);
            const exportedKeyForStorage = await crypto.subtle.exportKey('raw', vaultKey);
            sessionStorage.setItem('vaultKey', JSON.stringify(Array.from(new Uint8Array(exportedKeyForStorage))));

            console.log("✅ Vault key derived and stored in sessionStorage");
            refreshAuth(); // 🔥 updates app state immediately

            if (onSuccess) onSuccess();
            else navigate('/dashboard');
        } catch (err: any) {
            console.error('Vault key derivation error:', err);
            setError('Failed to derive vault key. Please check your master password.');
            setLoading(false);
        }
    };

    if (loading && !showPasswordPrompt) return <div className="text-center p-8">Loading camera...</div>;

    if (showPasswordPrompt) {
        return (
            <div className="min-h-screen app-bg-neutral flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow p-6 w-full max-w-md animate-scale-in">
                    {/* Success Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="icon-bubble bg-green-50 rounded-xl">
                            <svg className="w-8 h-8 text-green-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-1 text-center text-gray-900">
                        Face Verified Successfully!
                    </h2>
                    <p className="text-gray-500 text-sm mb-6 text-center">
                        Enter your master password to unlock your vault.
                    </p>
                    
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Master Password
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                required
                                autoFocus
                            />
                        </div>
                        
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-slide-down">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </div>
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-base btn-primary disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Unlocking Your Vault...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                    Unlock Vault
                                </span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen app-bg-neutral flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow p-6 w-full max-w-md text-center animate-scale-in">
                {/* Header with animated icon */}
                <div className="mb-6">
                    <div className="inline-block icon-bubble rounded-xl mb-4 animate-pulse">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        Face Recognition
                    </h2>
                    <p className="text-gray-500 text-sm">Position your face in the camera</p>
                </div>

                {/* Video with scanning effect */}
                <div className="mb-6 rounded-xl overflow-hidden bg-gray-900 relative border-4 border-blue-200 shadow-lg">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-64 object-cover" />
                    {/* Scanning overlay effect */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 border-2 border-blue-400 rounded-xl animate-pulse"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-blue-500 rounded-full opacity-50 animate-pulse"></div>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 animate-slide-down">
                        <div className="flex items-center justify-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    </div>
                )}

                {/* Verify button */}
                <button
                    onClick={verify}
                    disabled={loading}
                    className="w-full btn-base btn-primary disabled:opacity-50 mb-3"
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Verifying Face...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Verify My Face
                        </span>
                    )}
                </button>

                {/* Back button */}
                <button
                    onClick={() => window.history.back()}
                    className="w-full btn-base btn-secondary"
                >
                    <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Login
                    </span>
                </button>
            </div>
        </div>
    );
};

export default FaceAuth;
