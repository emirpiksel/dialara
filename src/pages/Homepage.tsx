import React, { useState } from 'react';
import { AuthForm } from '../components/AuthForm';
import { Header } from '../components/Header';
import { useWaitlistStore } from '../store/waitlist';
import {
  Phone,
  Users,
  BarChart2,
  Shield,
  ArrowRight,
  Play,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export function Homepage() {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { joinWaitlist } = useWaitlistStore();

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await joinWaitlist(email, 'homepage');
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setErrorMessage('Failed to join waitlist. Please try again.');
    }
  };

  const renderWaitlistStatus = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="mt-2 text-blue-600 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Joining waitlist...
          </div>
        );
      case 'success':
        return (
          <div className="mt-2 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            You're on the list! We'll notify you when features launch.
          </div>
        );
      case 'error':
        return (
          <div className="mt-2 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errorMessage}
          </div>
        );
      default:
        return null;
    }
  };

  const features = [
    {
      icon: <Phone className="h-6 w-6 text-blue-500" />,
      title: 'Smart Call Management',
      description: 'Handle inbound, outbound, and web calls with AI assistance. Never miss a patient call again.'
    },
    {
      icon: <Users className="h-6 w-6 text-green-500" />,
      title: 'Automated Lead Tracking',
      description: 'Convert calls into leads automatically. Track status and follow-ups effortlessly.'
    },
    {
      icon: <BarChart2 className="h-6 w-6 text-purple-500" />,
      title: 'Real-time Analytics',
      description: 'Get insights into call patterns, conversion rates, and team performance.'
    },
    {
      icon: <Shield className="h-6 w-6 text-indigo-500" />,
      title: 'HIPAA Compliant',
      description: 'Secure, compliant call handling and data storage for healthcare providers.'
    }
  ];

  return (
    <div className="bg-white">
      <Header />

      <div className="pt-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 transform -skew-y-6"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Never Miss a Patient Call Again!
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                AI-Powered call management for clinics. Handle calls, track leads, and grow your practice—effortlessly.
              </p>

              {/* Waitlist Form */}
              <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto mb-8">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email for updates"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Join Waitlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
                {renderWaitlistStatus()}
              </form>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => setShowAuthForm(true)}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    const demoSection = document.getElementById('how-it-works');
                    demoSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Watch Demo
                  <Play className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <button
              onClick={() => setShowAuthForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              ×
            </button>
            <AuthForm />
          </div>
        </div>
      )}
    </div>
  );
}
