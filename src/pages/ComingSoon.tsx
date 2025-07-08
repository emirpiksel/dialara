import React, { useState } from 'react';
import { Header } from '../components/Header';
import {
  Clock,
  MessageSquare,
  Brain,
  BarChart2,
  Star,
  Users,
  Zap,
  Trophy,
  Bell,
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useWaitlistStore } from '../store/waitlist';

export function ComingSoon() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { joinWaitlist } = useWaitlistStore();

  const upcomingFeatures = [
    {
      icon: <Brain className="w-6 h-6 text-purple-500" />,
      title: 'Smart Call Scheduling',
      description: 'AI predicts the best time to call for higher conversions',
      features: ['AI-powered best time predictions', 'Automated follow-up scheduling', 'Calendar integration', 'Smart reminders']
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-blue-500" />,
      title: 'Voice Analytics',
      description: 'Unlock insights from conversations with sentiment analysis',
      features: ['Sentiment analysis', 'Keyword tracking', 'Conversation insights', 'Quality scoring']
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      title: 'Lead Scoring',
      description: 'AI prioritizes leads based on conversion likelihood',
      features: ['AI-based qualification', 'Engagement tracking', 'Conversion probability', 'Priority distribution']
    },
    {
      icon: <Users className="w-6 h-6 text-green-500" />,
      title: 'Multi-Channel Hub',
      description: 'Unified communication across all channels',
      features: ['WhatsApp integration', 'SMS capabilities', 'Email automation', 'Video scheduling']
    }
  ];

  const benefits = [
    { icon: <Zap className="w-6 h-6 text-yellow-500" />, title: 'Early Access', description: 'Be among the first to try new features' },
    { icon: <Trophy className="w-6 h-6 text-purple-500" />, title: 'Special Pricing', description: 'Lock in early-bird discounts forever' },
    { icon: <Bell className="w-6 h-6 text-blue-500" />, title: 'Priority Updates', description: 'Get notified when features launch' },
    { icon: <Lock className="w-6 h-6 text-green-500" />, title: 'Exclusive Training', description: 'Access to private onboarding sessions' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await joinWaitlist(email, 'coming_soon');
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setErrorMessage('Failed to join waitlist. Please try again.');
    }
  };

  const renderFormStatus = () => {
    switch (status) {
      case 'loading':
        return <div className="mt-2 text-blue-600 flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>Joining waitlist...</div>;
      case 'success':
        return <div className="mt-2 text-green-600 flex items-center justify-center"><CheckCircle className="w-4 h-4 mr-2" />You're on the list! We'll notify you when features launch.</div>;
      case 'error':
        return <div className="mt-2 text-red-600 flex items-center justify-center"><AlertCircle className="w-4 h-4 mr-2" />{errorMessage}</div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />

      <div className="pt-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <div className="flex items-center justify-center mb-8">
                <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-800 text-sm font-semibold flex items-center">
                  <Clock className="w-4 h-4 mr-2" /> Coming Soon
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                The Future of AI Call Management
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600"> Is Here</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Get ready for smarter call scheduling, automated lead scoring, and voice insights. Join the waitlist to be first in line when these game-changing features launch.
              </p>

              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" required disabled={status === 'loading'} />
                  <button type="submit" disabled={status === 'loading'} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                    Join Waitlist <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
                {renderFormStatus()}
              </form>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Upcoming Features</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Transform your clinic's communication with our next generation of AI-powered features.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {upcomingFeatures.map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="h-12 w-12 bg-gray-50 rounded-lg flex items-center justify-center">{feature.icon}</div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
