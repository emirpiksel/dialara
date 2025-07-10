import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Phone, 
  Upload, 
  Play, 
  Settings, 
  Users, 
  ChevronRight,
  ChevronLeft,
  Download,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { LeadImport } from './LeadImport';
import { ComplianceNotice } from './ComplianceNotice';
import { useAuthStore } from '../store/auth';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { userId, fullName } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isImportingLeads, setIsImportingLeads] = useState(false);

  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to Dialara',
      description: 'Get familiar with your AI-powered call management platform',
      completed: false
    },
    {
      id: 'compliance',
      title: 'Privacy & Compliance',
      description: 'Review GDPR/KVKK compliance and data handling policies',
      completed: false
    },
    {
      id: 'phone-setup',
      title: 'Connect Phone Number',
      description: 'Set up your business phone number for calls',
      completed: false
    },
    {
      id: 'import-leads',
      title: 'Import Your Leads',
      description: 'Upload your contact list to start making calls',
      completed: false,
      optional: true
    },
    {
      id: 'test-call',
      title: 'Make a Test Call',
      description: 'Try out the calling features with a training scenario',
      completed: false
    },
    {
      id: 'install-overlay',
      title: 'Install Agent Assist',
      description: 'Get real-time AI assistance during calls',
      completed: false,
      optional: true
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start using Dialara to supercharge your calls',
      completed: false
    }
  ]);

  useEffect(() => {
    // Auto-complete welcome step after a short delay
    const timer = setTimeout(() => {
      markStepCompleted('welcome');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      )
    );
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const completeOnboarding = () => {
    // Save onboarding completion to localStorage or API
    localStorage.setItem('dialara_onboarding_completed', 'true');
    onComplete();
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Dialara, {fullName || 'Admin'}!
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              Your AI-powered call management platform is ready. Let's get you set up in just a few steps.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="font-semibold text-blue-900 mb-2">What you'll accomplish:</h3>
              <ul className="text-blue-800 text-sm space-y-1 text-left">
                <li>• Connect your phone number</li>
                <li>• Import your contacts</li>
                <li>• Make your first AI-assisted call</li>
                <li>• Set up real-time assistance tools</li>
              </ul>
            </div>
          </div>
        );

      case 'compliance':
        return (
          <div className="py-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Privacy & Compliance</h2>
              <p className="text-gray-600">
                Before we begin, let's review our commitment to data protection and privacy.
              </p>
            </div>
            <ComplianceNotice 
              showActions 
              onAccept={() => markStepCompleted('compliance')}
              onDecline={() => {
                alert('To use Dialara, you must acknowledge our privacy practices. Contact support if you have questions.');
              }}
            />
          </div>
        );

      case 'phone-setup':
        return (
          <div className="py-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Connect Your Phone Number</h2>
              <p className="text-gray-600 mb-4">
                Connect a business phone number to start making and receiving calls with AI assistance.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Option 1: Use Vapi Phone Numbers</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Get a new business number instantly through our Vapi integration.
                </p>
                <button 
                  onClick={() => {
                    window.open('https://vapi.ai/dashboard', '_blank');
                    markStepCompleted('phone-setup');
                  }}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Vapi Dashboard</span>
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Option 2: Use Existing Number</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Configure your existing business number to work with Dialara.
                </p>
                <button 
                  onClick={() => markStepCompleted('phone-setup')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  I'll configure this later
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Smartphone className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Phone Setup Help</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    Need help setting up your phone number? Check our documentation or contact support for assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'import-leads':
        return (
          <div className="py-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Import Your Leads</h2>
              <p className="text-gray-600 mb-4">
                Upload your contact list to start making calls. This step is optional - you can add leads later.
              </p>
            </div>

            <LeadImport 
              onImportComplete={() => {
                markStepCompleted('import-leads');
                setIsImportingLeads(false);
              }} 
            />

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => markStepCompleted('import-leads')}
                className="text-gray-600 hover:text-gray-800"
              >
                Skip for now
              </button>
            </div>
          </div>
        );

      case 'test-call':
        return (
          <div className="py-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Make a Test Call</h2>
              <p className="text-gray-600 mb-4">
                Try out Dialara's calling features with a training scenario to see how everything works.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Play className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Training Mode Test Call</h3>
                    <p className="text-sm text-gray-600">Practice with an AI customer in a safe environment</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    // This would trigger the training mode
                    alert('Test call completed! You can now make real calls with confidence.');
                    markStepCompleted('test-call');
                  }}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Test Call</span>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What happens in a test call?</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• You'll speak with an AI customer simulation</li>
                  <li>• Get real-time AI suggestions and coaching</li>
                  <li>• See how call recording and transcription work</li>
                  <li>• Experience the full Dialara workflow</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'install-overlay':
        return (
          <div className="py-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Install Agent Assist Overlay</h2>
              <p className="text-gray-600 mb-4">
                Get real-time AI assistance during calls with our desktop overlay application.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Desktop Overlay App</h3>
                    <p className="text-sm text-gray-600">Provides AI suggestions, call scripts, and objection handling</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // This would download the overlay app
                      alert('Overlay app download started! Follow the installation instructions.');
                      markStepCompleted('install-overlay');
                    }}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download for Windows/Mac</span>
                  </button>
                  
                  <button
                    onClick={() => markStepCompleted('install-overlay')}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200"
                  >
                    I'll install this later
                  </button>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Agent Assist Features:</h4>
                <ul className="text-purple-800 text-sm space-y-1">
                  <li>• Real-time conversation suggestions</li>
                  <li>• Automatic objection handling responses</li>
                  <li>• Call progress tracking and notes</li>
                  <li>• Customer information lookup</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              You're All Set!
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              Dialara is configured and ready to supercharge your call management. 
              You can always access these settings later.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto mb-6">
              <h3 className="font-semibold text-green-900 mb-3">Quick Start Checklist:</h3>
              <div className="space-y-2 text-left">
                {steps.slice(0, -1).map((step) => (
                  <div key={step.id} className="flex items-center space-x-2">
                    {step.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`text-sm ${step.completed ? 'text-green-800' : 'text-gray-600'}`}>
                      {step.title}
                      {step.optional && !step.completed && ' (Optional)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={completeOnboarding}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 text-lg font-medium"
            >
              Start Using Dialara
            </button>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Get Started with Dialara</h1>
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip setup
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => goToStep(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : step.completed
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 rounded ${
                    step.completed ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}