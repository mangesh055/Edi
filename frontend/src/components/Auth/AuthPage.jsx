import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import toast from 'react-hot-toast';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Successfully logged in!');
        navigate('/dashboard'); // or back to home
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Signup successful! Check your email to verify.');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const isMissingEnv = !process.env.REACT_APP_SUPABASE_URL;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', backgroundColor: '#f8fafc', padding: '20px',
      flexDirection: 'column'
    }}>
      {isMissingEnv && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c',
          padding: '16px', borderRadius: '8px', marginBottom: '24px', maxWidth: '420px', width: '100%',
          fontSize: '14px', lineHeight: '1.5'
        }}>
          <strong>⚠️ Missing Supabase Configuration</strong>
          <p style={{ margin: '8px 0 0' }}>
            Please create a <code>.env</code> file in the <code>frontend</code> folder with your <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      )}

      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '420px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 'bold', margin: '0 auto 16px'
          }}>⚡</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            {isLogin ? 'Sign in to access your saved projects' : 'Sign up to save your data analysis projects'}
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box',
                outline: 'none', transition: 'border-color 0.2s ease'
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box',
                outline: 'none', transition: 'border-color 0.2s ease'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px', borderRadius: '8px', fontSize: '15px', fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', marginTop: '10px'
            }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748b' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ 
              background: 'none', border: 'none', color: '#4f46e5', 
              fontWeight: 600, cursor: 'pointer', padding: 0 
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
