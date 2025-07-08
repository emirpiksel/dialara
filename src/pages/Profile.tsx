import React, { useEffect, useState } from 'react';
import { User, Mail, Lock, Save } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';

export function Profile() {
  const { userId, email: initialEmail, fullName: initialFullName, checkAuth, isAdmin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialFullName) setFullName(initialFullName);

    const fetchClinicName = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("users")
        .select("clinic_name")
        .eq("id", userId)
        .single();
      if (data?.clinic_name) setClinicName(data.clinic_name);
    };

    fetchClinicName();
  }, [initialEmail, initialFullName, userId]);

  const handleSave = async () => {
    if (!userId) {
      alert("User ID is missing!");
      return;
    }

    setLoading(true);

    const updates = {
      email,
      full_name: fullName,
      clinic_name: clinicName,  // Admins can modify this
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      alert('Failed to update profile: ' + error.message);
    } else {
      alert('Profile updated successfully');
      await checkAuth();
    }

    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert('Failed to update password: ' + error.message);
    } else {
      alert('Password updated successfully');
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h1>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700">
                  Clinic Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    id="clinicName"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="block w-full pl-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Clinic Name (optional)"
                    disabled={!isAdmin} // Disable clinic name field for non-admins
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Change Password
            </h2>
            {!isChangingPassword ? (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Lock className="h-5 w-5 mr-2 text-gray-400" />
                Change Password
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Password
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
