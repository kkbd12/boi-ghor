import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { LoadingSpinner, BookOpenIcon } from './icons';

interface AuthComponentProps {
    onBack?: () => void;
}

const AuthComponent: React.FC<AuthComponentProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
        setError("Supabase client not initialized.");
        setLoading(false);
        return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // The onAuthStateChange listener in App.tsx will handle navigation.
    } catch (error: any) {
      setError(error.error_description || error.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-900 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-stone-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <BookOpenIcon className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white mt-4">অ্যাডমিন লগইন</h1>
          <p className="text-md text-stone-600 dark:text-stone-400 mt-2">
            বই যোগ বা সম্পাদনা করতে লগইন করুন।
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">ইমেইল</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-stone-700 dark:text-stone-300">পাসওয়ার্ড</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-400 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner className="w-5 h-5 animate-spin" /> : 'লগইন করুন'}
            </button>
          </div>
        </form>
         {onBack && (
            <div className="mt-4 text-center">
                <button onClick={onBack} className="text-sm text-amber-600 hover:underline">লাইব্রেরিতে ফিরে যান</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AuthComponent;
