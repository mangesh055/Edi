import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase } from '../../api/supabaseClient';
import { getSession, getReviewState } from '../../api/api';
import toast from 'react-hot-toast';


function ProfilePage() {
  const { user, signOut } = useAuth();
  const { resetAll, setUploadData, setCleaningData } = useData();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State for editable fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  const [stats, setStats] = useState({
    projectsCount: 0,
    joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown',
  });

  const [recentProjects, setRecentProjects] = useState([]);
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Initialize editable fields
    setEmail(user.email || '');
    setUsername(user.user_metadata?.username || user.email?.split('@')[0] || 'User');

    try {
      const raw = JSON.parse(localStorage.getItem('statsflow-recent-projects') || '[]');
      setRecentProjects(raw);
      setStats(prev => ({
        ...prev,
        projectsCount: raw.length
      }));

      // Generate Activity Data for GitHub-style graph
      const today = new Date();
      const dataMap = {};
      const result = [];
      
      // Count actual projects
      raw.forEach(p => {
        if (p.openedAt) {
          const dateStr = new Date(p.openedAt).toISOString().split('T')[0];
          dataMap[dateStr] = (dataMap[dateStr] || 0) + 1;
        }
      });

      // Generate last 364 days (52 weeks * 7 days)
      for (let i = 363; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Get actual count of projects uploaded on this date
        const count = dataMap[dateStr] || 0;
        
        let level = 0;
        if (count === 1) level = 1;
        else if (count === 2) level = 2;
        else if (count >= 3) level = 3;
        
        result.push({ date: dateStr, count, level, dateObj: d });
      }
      setActivityData(result);

    } catch {
      setRecentProjects([]);
      setActivityData([]);
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    resetAll();
    setLoading(false);
    toast.success('Successfully signed out');
    navigate('/');
  };

  const handleOpenRecent = async (project) => {
    if (!project.sessionId) {
      toast('This project does not have a saved session.', { icon: 'ℹ️' });
      return;
    }
    const toastId = toast.loading(`Resuming ${project.filename}...`);
    try {
      // Get base session details (raw data)
      const sessionData = await getSession(project.sessionId);
      
      if (!sessionData.success || !sessionData.raw) {
        throw new Error('Session data could not be retrieved');
      }

      setUploadData({
        session_id: sessionData.session_id,
        filename: sessionData.filename,
        shape: sessionData.raw.shape,
        health_score: sessionData.raw.health_score,
        columns_info: sessionData.raw.columns_info,
        data_preview: sessionData.raw.data_preview,
        column_names: sessionData.raw.column_names,
        quality_scorecard: null,
        anomaly_report: null,
      });

      // Try to get cleaned state if available
      if (sessionData.status !== 'uploaded') {
        try {
          const reviewData = await getReviewState(project.sessionId);
          if (reviewData.success) {
            setCleaningData({
              cleaned_shape: reviewData.cleaned_shape,
              cleaned_health_score: reviewData.cleaned_health_score,
              cleaning_report: reviewData.cleaning_report,
              pipeline_script: reviewData.pipeline_script || null,
              raw_preview: reviewData.raw_preview,
              cleaned_preview: reviewData.cleaned_preview,
              modified_cells: reviewData.modified_cells || [],
              change_log: reviewData.change_log || [],
              change_summary: reviewData.change_summary || null,
              review_summary: reviewData.review_summary || null,
              workflow_state: reviewData.workflow_state || null,
              status: reviewData.status || null,
              quality_scorecard: reviewData.quality_scorecard || null,
              anomaly_report: reviewData.anomaly_report || null,
              approval_guardrails: reviewData.approval_guardrails || null,
            });
            toast.success('Session resumed with cleaned data!', { id: toastId });
            navigate('/dashboard');
            return;
          }
        } catch (e) {
          console.warn('Could not load cleaned state, continuing with raw data', e);
        }
      }

      toast.success('Session resumed with raw data!', { id: toastId });
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to resume session. Please re-upload.', { id: toastId });
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updates = {};
      if (email !== user.email) updates.email = email;
      updates.data = { username };

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      toast.success(updates.email ? 'Profile updated! Please check your email to verify.' : 'Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ 
      padding: '40px 20px', 
      maxWidth: '1100px', 
      margin: '0 auto', 
      fontFamily: 'Inter, sans-serif',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0'
      }}>
        <h1 style={{ fontSize: '32px', margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Account <span style={{ color: '#6366f1' }}>Overview</span>
        </h1>
        <button 
          onClick={handleSignOut}
          disabled={loading}
          style={{
            padding: '10px 20px', borderRadius: '12px', border: 'none',
            backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.1)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
        >
          {loading ? 'Signing out...' : <><span>🚪</span> Sign Out</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px' }}>
        
        {/* Left Column: User Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ 
            backgroundColor: '#fff', borderRadius: '24px', padding: '40px 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', 
            textAlign: 'center', position: 'relative', overflow: 'hidden'
          }}>
            {/* Background decorative blob */}
            <div style={{
              position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px',
              background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(255,255,255,0) 70%)',
              zIndex: 0
            }} />

            <div style={{
              width: '96px', height: '96px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '40px', fontWeight: 'bold', margin: '0 auto 20px', textTransform: 'uppercase',
              boxShadow: '0 10px 25px rgba(99,102,241,0.4)', position: 'relative', zIndex: 1
            }}>
              {username?.[0] || 'U'}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    style={{
                      width: '100%', padding: '10px 16px', borderRadius: '10px',
                      border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none',
                      transition: 'border-color 0.2s', boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    style={{
                      width: '100%', padding: '10px 16px', borderRadius: '10px',
                      border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none',
                      transition: 'border-color 0.2s', boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white', fontWeight: 600, cursor: 'pointer',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setEmail(user.email || '');
                        setUsername(user.user_metadata?.username || user.email?.split('@')[0] || 'User');
                      }}
                      disabled={saving}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: '22px', margin: '0 0 4px', color: '#0f172a', fontWeight: 700 }}>
                    {username}
                  </h2>
                  <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '14px' }}>
                    {email}
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      padding: '8px 20px', borderRadius: '100px', border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc', color: '#475569', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  >
                    ✏️ Edit Profile
                  </button>
                </>
              )}
            </div>

            <div style={{ 
              marginTop: '32px', paddingTop: '24px', borderTop: '1px dashed #e2e8f0',
              display: 'flex', justifyContent: 'center', gap: '32px', position: 'relative', zIndex: 1
            }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {stats.projectsCount}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', fontWeight: 600 }}>
                  Projects
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {stats.joinDate}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', fontWeight: 600 }}>
                  Joined
                </div>
              </div>
            </div>
          </div>
          
          {/* Contribution Graph (Custom Native Implementation) */}
          <div style={{ 
            backgroundColor: '#fff', borderRadius: '24px', padding: '32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
            overflow: 'hidden'
          }}>
            <h3 style={{ fontSize: '18px', margin: '0 0 24px', color: '#0f172a', fontWeight: 700 }}>
              Activity
            </h3>
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: 52 }).map((_, weekIdx) => (
                  <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {activityData.slice(weekIdx * 7, (weekIdx + 1) * 7).map((day, dayIdx) => {
                      const colors = ['#f1f5f9', '#c7d2fe', '#818cf8', '#4f46e5'];
                      return (
                        <div 
                          key={day.date}
                          title={`${day.count} datasets on ${day.date}`}
                          style={{
                            width: '12px', height: '12px',
                            backgroundColor: colors[day.level] || colors[0],
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
                <span>Less</span>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '3px' }} />
                <div style={{ width: '12px', height: '12px', backgroundColor: '#c7d2fe', borderRadius: '3px' }} />
                <div style={{ width: '12px', height: '12px', backgroundColor: '#818cf8', borderRadius: '3px' }} />
                <div style={{ width: '12px', height: '12px', backgroundColor: '#4f46e5', borderRadius: '3px' }} />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div style={{ 
          backgroundColor: '#fff', borderRadius: '24px', padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', margin: 0, color: '#0f172a', fontWeight: 700 }}>
              Recent Datasets
            </h3>
            <button 
              onClick={() => navigate('/')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', fontSize: '13px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
            >
              + New Project
            </button>
          </div>
          
          {recentProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📂</div>
              <p style={{ fontSize: '15px' }}>You haven't analyzed any datasets yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentProjects.slice(0, 5).map((project, idx) => (
                <div key={idx} 
                  onClick={() => handleOpenRecent(project)}
                  style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9',
                  backgroundColor: '#fafaf9', transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                      width: '48px', height: '48px', borderRadius: '12px', 
                      backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      📊
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px', fontSize: '15px' }}>
                        {project.filename}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                        {project.rows?.toLocaleString()} rows • {new Date(project.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      display: 'inline-block', padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700,
                      backgroundColor: project.healthScore > 80 ? '#dcfce7' : '#fef3c7',
                      color: project.healthScore > 80 ? '#15803d' : '#92400e',
                      border: `1px solid ${project.healthScore > 80 ? '#bbf7d0' : '#fde68a'}`
                    }}>
                      Health: {project.healthScore ? project.healthScore.toFixed(1) : 'N/A'}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
