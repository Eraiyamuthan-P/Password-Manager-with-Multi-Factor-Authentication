import React, { useRef, useEffect, useState } from 'react';
// import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

const FaceEnroll: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        startCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                console.log('Camera stream started:', stream);
            } else {
                console.warn('videoRef.current is null');
            }
            setLoading(false); // Enable button when camera is ready
        } catch (err) {
            setError('Camera access denied or not available. Please allow camera permissions and ensure no other app is using the camera.');
            console.error('Camera error:', err);
            setLoading(false); // Enable button even if camera fails
        }
    };

    const enroll = async () => {
        if (!videoRef.current) return;
        setError('');
        setLoading(true);
        try {
            // Check if video is ready
            const video = videoRef.current;
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                setError('Camera not ready. Please wait a moment and try again.');
                setLoading(false);
                return;
            }
            // Capture image from video
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

            // Send image to deepface backend for face descriptor
            const res = await fetch('http://localhost:5001/api/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            });
            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Face detection failed');
            }

            // Save face descriptor to user profile
            await authAPI.enrollFace(result.faceDescriptor);
            setSuccess(true);
            setTimeout(() => navigate('/settings'), 2000);
        } catch (err: any) {
            setError(err.message || 'Enrollment failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="min-h-screen app-bg-gradient flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4">Enroll Your Face</h2>
                <p className="text-gray-600 mb-6">Look directly at the camera</p>

                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full rounded-lg mb-4 border-2 border-gray-200"
                    style={{ background: '#222', minHeight: 200 }}
                />
                {!loading && !error && videoRef.current && !videoRef.current.srcObject && (
                    <div className="text-red-600 mb-4">Camera stream not available. Check permissions and close other camera apps.</div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        ✅ Face enrolled! Redirecting...
                    </div>
                )}

                <button
                    onClick={enroll}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Enroll Face'}
                </button>

                <button
                    onClick={() => navigate('/settings')}
                    className="mt-4 text-purple-600 hover:underline text-sm"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default FaceEnroll;
