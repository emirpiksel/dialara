import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Unlink, 
  Clock,
  Users,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface CalendarStatus {
  connected: boolean;
  status: 'not_connected' | 'active' | 'expired' | 'error';
  calendar_id?: string;
  scopes?: string;
  last_sync?: string;
  expires_at?: string;
  error?: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  day: string;
  date: string;
}

interface AvailableSlots {
  status: 'success' | 'error';
  available_slots?: TimeSlot[];
  message?: string;
}

export function CalendarIntegration() {
  const { userId } = useAuthStore();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    connected: false,
    status: 'not_connected'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (userId) {
      checkCalendarStatus();
    }
  }, [userId]);

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch(`/api/calendar/status?user_id=${userId}`);
      const status = await response.json();
      setCalendarStatus(status);
    } catch (error) {
      console.error('Error checking calendar status:', error);
      setCalendarStatus({
        connected: false,
        status: 'error',
        error: 'Failed to check connection status'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectCalendar = () => {
    // In production, this would redirect to Google OAuth
    const googleAuthUrl = `https://accounts.google.com/oauth2/authorize?client_id=your_client_id&redirect_uri=${encodeURIComponent(window.location.origin + '/api/calendar/callback')}&scope=https://www.googleapis.com/auth/calendar&response_type=code&access_type=offline`;
    
    // For demo purposes, show connection dialog
    const confirmed = window.confirm(
      'This would redirect you to Google to authorize calendar access. ' +
      'In a production environment, you would be redirected to Google OAuth. ' +
      'Click OK to simulate a successful connection.'
    );
    
    if (confirmed) {
      // Simulate successful connection
      setCalendarStatus({
        connected: true,
        status: 'active',
        calendar_id: 'primary',
        scopes: 'https://www.googleapis.com/auth/calendar',
        last_sync: new Date().toISOString()
      });
    }
  };

  const disconnectCalendar = async () => {
    const confirmed = window.confirm('Are you sure you want to disconnect Google Calendar? This will stop AI scheduling functionality.');
    
    if (!confirmed) return;

    try {
      await fetch(`/api/calendar/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      setCalendarStatus({
        connected: false,
        status: 'not_connected'
      });
      setAvailableSlots(null);
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  const checkAvailability = async () => {
    setIsChecking(true);
    setAvailableSlots(null);

    try {
      const startDate = new Date(selectedDate).toISOString();
      const response = await fetch('/api/calendar/available-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: userId,
          start_date: startDate,
          duration: "60"
        })
      });

      const result = await response.json();
      setAvailableSlots(result);
    } catch (error) {
      setAvailableSlots({
        status: 'error',
        message: 'Failed to check availability'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const scheduleDemo = async (slot: TimeSlot) => {
    try {
      const response = await fetch('/api/calendar/schedule-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          title: 'Demo Meeting - Dialara AI Call',
          start_time: new Date(slot.start_time).toISOString(),
          duration: "60",
          description: 'Demo meeting scheduled via Dialara AI'
        })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        alert(`Meeting scheduled successfully for ${slot.start_time}!`);
        checkAvailability(); // Refresh available slots
      } else {
        alert(`Failed to schedule meeting: ${result.message}`);
      }
    } catch (error) {
      alert('Error scheduling meeting');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'expired': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expired': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading calendar integration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Calendar Integration</h2>
        <p className="text-gray-600">
          Connect Google Calendar to enable AI-powered meeting scheduling during calls.
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Google Calendar</h3>
              <p className="text-sm text-gray-600">
                {calendarStatus.connected ? 'Connected and ready for AI scheduling' : 'Not connected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon(calendarStatus.status)}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(calendarStatus.status)}`}>
              {calendarStatus.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {calendarStatus.connected ? (
          <div className="space-y-4">
            {/* Connection Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Calendar:</span>
                <span className="ml-2 text-gray-800">{calendarStatus.calendar_id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Last Sync:</span>
                <span className="ml-2 text-gray-800">
                  {calendarStatus.last_sync 
                    ? new Date(calendarStatus.last_sync).toLocaleString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>

            {/* AI Scheduling Demo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">AI Scheduling Demo</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <button
                    onClick={checkAvailability}
                    disabled={isChecking}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 text-sm"
                  >
                    {isChecking ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span>{isChecking ? 'Checking...' : 'Find Available Times'}</span>
                  </button>
                </div>

                {availableSlots && (
                  <div className="mt-4">
                    {availableSlots.status === 'success' && availableSlots.available_slots ? (
                      <div>
                        <p className="text-blue-700 text-sm font-medium mb-2">
                          Available time slots for {selectedDate}:
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {availableSlots.available_slots.map((slot, index) => (
                            <div key={index} className="flex items-center justify-between bg-white border border-blue-200 rounded px-3 py-2">
                              <div className="text-sm">
                                <span className="font-medium">{slot.day}</span>
                                <span className="text-gray-600 ml-2">{slot.start_time} - {slot.end_time}</span>
                              </div>
                              <button
                                onClick={() => scheduleDemo(slot)}
                                className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Schedule Demo</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-700 text-sm">{availableSlots.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={checkCalendarStatus}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Status</span>
              </button>

              <button
                onClick={disconnectCalendar}
                className="flex items-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
              >
                <Unlink className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect your Google Calendar to enable AI assistants to schedule meetings during calls.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">AI Scheduling Features:</h4>
              <ul className="text-green-800 text-sm space-y-1">
                <li>• AI can find available time slots during calls</li>
                <li>• Automatic meeting scheduling with attendees</li>
                <li>• Smart conflict detection and resolution</li>
                <li>• Calendar invites sent automatically</li>
                <li>• Integration with Vapi function calls</li>
              </ul>
            </div>

            <button
              onClick={connectCalendar}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              <Calendar className="w-4 h-4" />
              <span>Connect Google Calendar</span>
            </button>
          </div>
        )}
      </div>

      {/* Function Call Documentation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">AI Function Calls</h3>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Available Functions for AI:</h4>
            <div className="space-y-3 text-sm">
              <div className="border-l-4 border-blue-500 pl-3">
                <code className="text-blue-700 font-mono">find_available_times(start_date, duration)</code>
                <p className="text-gray-600 mt-1">Finds available meeting slots in the calendar</p>
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <code className="text-green-700 font-mono">schedule_meeting(title, start_time, duration, attendee_email)</code>
                <p className="text-gray-600 mt-1">Schedules a meeting with the specified details</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-3">
                <code className="text-purple-700 font-mono">get_next_available(duration)</code>
                <p className="text-gray-600 mt-1">Gets the next available time slot for quick scheduling</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-yellow-700 text-sm">
              <li>Connect your Google Calendar using the button above</li>
              <li>Configure your Vapi assistant to use the calendar function calls</li>
              <li>The AI can now schedule meetings during calls automatically</li>
              <li>Meeting invites will be sent to attendees automatically</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}