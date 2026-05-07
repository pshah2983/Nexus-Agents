
import React, { useState } from 'react';
import { authService } from '../services/storageService';

interface AuthPageProps {
  onLoginSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await authService.login(email);
      if (!user.isVerified) {
        setMode('verify');
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.register(email, name);
      setInfo("Verification code sent to your email (Use: 1234 for demo).");
      setMode('verify');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.verifyEmail(email, verificationCode);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Nexus Agents
          </h1>
          <p className="text-slate-400 text-sm">
            {mode === 'login' ? 'Welcome back, Commander.' : 
             mode === 'register' ? 'Join the research collective.' : 
             'Verify your identity.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-6 p-3 bg-cyan-500/10 border border-cyan-500/50 rounded-lg text-cyan-300 text-sm text-center">
            {info}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase font-semibold mb-2">Email Address</label>
              <input 
                type="email" required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="agent@nexus.ai"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Initialize Session'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setMode('register')} className="text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                New here? Create an account
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
             <div>
              <label className="block text-xs text-slate-500 uppercase font-semibold mb-2">Agent Name</label>
              <input 
                type="text" required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Agent Smith"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase font-semibold mb-2">Email Address</label>
              <input 
                type="email" required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="agent@nexus.ai"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Create Account'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setMode('login')} className="text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                Already have an account? Login
              </button>
            </div>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-lg mb-4">
              <p className="text-cyan-200 text-sm text-center">
                A verification code has been sent to <strong>{email}</strong>.
                <br/><span className="text-xs opacity-70">(For demo use: 1234)</span>
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase font-semibold mb-2">Verification Code</label>
              <input 
                type="text" required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="0000"
                maxLength={4}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Enter'}
            </button>
             <div className="text-center mt-4">
              <button type="button" onClick={() => setMode('login')} className="text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
