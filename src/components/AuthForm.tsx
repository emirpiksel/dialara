import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAuthStore } from "../store/auth";

interface AuthFormProps {
  onClose: () => void;
}

export function AuthForm({ onClose }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch (err) {
      setError(isSignUp ? "Failed to create account" : "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError("Google login failed");
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!email) {
        setError("Enter your email to reset password");
        return;
      }
      await resetPassword(email);
      setError("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError("Failed to send reset email");
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isSignUp ? "Sign up for your account" : "Sign in to your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        )}

        {isSignUp && (
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your full name"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? isSignUp
              ? "Creating Account..."
              : "Signing in..."
            : isSignUp
            ? "Create Account"
            : "Sign In"}
        </button>

        {!isSignUp && (
          <div className="flex flex-col space-y-2 items-center">
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-sm text-yellow-600 hover:text-yellow-500"
            >
              Forgot your password?
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="text-sm text-red-600 hover:text-red-500"
            >
              Sign in with Google
            </button>
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}
