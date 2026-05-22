/**
 * StatsFlow Upload Page — Phase 1
 * ---------------------------------
 * Provides a drag-and-drop file upload interface.
 * On success, transitions to the Dashboard (Phase 2).
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { uploadDataset, connectDatabase } from '../../api/api';
import './UploadPage.css';

const ACCEPTED_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

const MAX_SIZE_MB = 50;

function UploadPage() {
  const { setUploadData } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragError, setDragError] = useState(null);
  
  // DB Connect State
  const location = useLocation();
  const [uploadMode, setUploadMode] = useState(location.state?.mode || 'file'); // 'file' or 'db'
  const [dbConnStr, setDbConnStr] = useState('');
  const [dbQuery, setDbQuery] = useState('');
  const [dbName, setDbName] = useState('db_import');

  // ── File Processing ──────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setDragError(null);

    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const data = await uploadDataset(file, (pct) => {
        setUploadProgress(pct);
      }, user ? user.id : null);

      toast.success(
        `✅ Dataset loaded! ${data.shape.rows.toLocaleString()} rows × ${data.shape.columns} columns`,
        { id: toastId, duration: 5000 }
      );

      setUploadData(data);
      navigate('/dashboard');

    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.';
      toast.error(msg, { id: toastId });
      setDragError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [setUploadData, navigate, user]);

  const handleDbConnect = async () => {
    if (!dbConnStr.trim() || !dbQuery.trim()) {
      setDragError("Please provide both connection string and query.");
      return;
    }
    setIsUploading(true);
    setDragError(null);
    const toastId = toast.loading('Connecting to database and running query...');
    try {
      const data = await connectDatabase(dbConnStr, dbQuery, dbName || 'db_import', user ? user.id : null);
      toast.success(
        `✅ Dataset loaded! ${data.shape.rows.toLocaleString()} rows × ${data.shape.columns} columns`,
        { id: toastId, duration: 5000 }
      );
      setUploadData(data);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Database connection failed.';
      toast.error(msg, { id: toastId });
      setDragError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Dropzone Configuration ───────────────────────────────────
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const reason = rejectedFiles[0]?.errors?.[0]?.message || 'Invalid file';
      setDragError(reason);
      return;
    }
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className="upload-page">
      {/* ── Hero Header ──────────────────────────────────────── */}
      <motion.div
        className="upload-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="upload-hero-badge">
          <span>🎓</span> VIT B.Tech CS & Data Science Project
        </div>
        <h1 className="upload-hero-title">
          Transform Raw Data Into
          <span className="gradient-text"> Intelligent Insights</span>
        </h1>
        <p className="upload-hero-description">
          Upload your dataset and StatsFlow will automatically clean it,
          visualize patterns, and let you converse with an AI analyst —
          all without writing a single line of code.
        </p>

        {/* Feature Pills */}
        <div className="upload-features">
          {[
            { icon: '🧹', text: 'Auto-Cleaning' },
            { icon: '📊', text: 'Smart Charts' },
            { icon: '📈', text: 'Trend Insights' },
            { icon: '🤖', text: 'AI Q&A' },
            { icon: '🐍', text: 'Export Pipeline' },
          ].map(f => (
            <div key={f.text} className="upload-feature-pill">
              <span>{f.icon}</span> {f.text}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', gap: '10px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <button onClick={() => setUploadMode('file')} className={`btn ${uploadMode === 'file' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '150px' }}>📁 File Upload</button>
        <button onClick={() => setUploadMode('db')} className={`btn ${uploadMode === 'db' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '150px' }}>🔌 Live Database</button>
      </motion.div>

      {/* ── Main Input Area ─────────────────────────────────────────── */}
      <motion.div
        className="upload-dropzone-wrapper"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {uploadMode === 'file' ? (
          <div
            {...getRootProps()}
            className={[
              'upload-dropzone',
              isDragActive  ? 'upload-dropzone--active'   : '',
              isUploading   ? 'upload-dropzone--uploading' : '',
              dragError     ? 'upload-dropzone--error'     : '',
            ].join(' ')}
          >
            <input {...getInputProps()} />

            {isUploading ? (
              <div className="upload-progress-state">
                <div className="upload-spinner" />
                <h3>Processing your dataset...</h3>
                <div className="upload-progress-bar-wrapper">
                  <div
                    className="upload-progress-bar"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p>{uploadProgress}% uploaded</p>
              </div>
            ) : isDragActive ? (
              <div className="upload-drag-state">
                <div className="upload-drag-icon">📂</div>
                <h3>Drop your file here!</h3>
                <p>Release to begin analysis</p>
              </div>
            ) : (
              <div className="upload-idle-state">
                <div className="upload-icon-wrapper">
                  <div className="upload-icon">📁</div>
                  <div className="upload-icon-ring" />
                </div>
                <h3>Drag & Drop your dataset</h3>
                <p>or click to browse files</p>
                <div className="upload-formats">
                  <span className="badge badge-info">CSV</span>
                  <span className="badge badge-info">XLSX</span>
                  <span className="badge badge-info">XLS</span>
                </div>
                <p className="upload-size-note">Maximum file size: {MAX_SIZE_MB}MB</p>
              </div>
            )}
          </div>
        ) : (
          <div className="upload-dropzone" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Connect to Database</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', textAlign: 'center' }}>Connect live to PostgreSQL, MySQL, SQLite, or other SQLAlchemy supported DBs.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Connection String</label>
              <input 
                type="text" 
                placeholder="postgresql://user:password@localhost:5432/dbname" 
                value={dbConnStr} 
                onChange={e => setDbConnStr(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                disabled={isUploading}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>SQL Query / Table Name</label>
              <textarea 
                placeholder="SELECT * FROM users" 
                value={dbQuery} 
                onChange={e => setDbQuery(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', minHeight: '80px', fontFamily: 'monospace' }}
                disabled={isUploading}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Dataset Name (optional)</label>
              <input 
                type="text" 
                placeholder="my_database_export" 
                value={dbName} 
                onChange={e => setDbName(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                disabled={isUploading}
              />
            </div>

            <button 
              onClick={handleDbConnect} 
              disabled={isUploading || !dbConnStr.trim() || !dbQuery.trim()}
              style={{ padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: (isUploading || !dbConnStr.trim() || !dbQuery.trim()) ? 'not-allowed' : 'pointer', opacity: (isUploading || !dbConnStr.trim() || !dbQuery.trim()) ? 0.6 : 1 }}
            >
              {isUploading ? 'Connecting & Importing...' : '🔌 Connect & Import'}
            </button>
          </div>
        )}

        {/* Error Message */}
        {dragError && (
          <motion.div
            className="upload-error"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ⚠️ {dragError}
          </motion.div>
        )}
      </motion.div>

      {/* ── Workflow Preview ──────────────────────────────────── */}
      <motion.div
        className="upload-workflow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="upload-workflow-title">How It Works</h3>
        <div className="upload-workflow-steps">
          {[
            { step: '1', icon: '📤', title: 'Upload', desc: 'CSV or Excel file' },
            { step: '2', icon: '🧹', title: 'Clean', desc: 'Automated imputation & outlier removal' },
            { step: '3', icon: '📊', title: 'Visualize', desc: 'Interactive charts & trend highlights' },
            { step: '4', icon: '🤖', title: 'Chat', desc: 'Ask AI questions about your data' },
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              <div className="upload-workflow-step">
                <div className="upload-workflow-step-num">{s.step}</div>
                <div className="upload-workflow-step-icon">{s.icon}</div>
                <div className="upload-workflow-step-title">{s.title}</div>
                <div className="upload-workflow-step-desc">{s.desc}</div>
              </div>
              {idx < 3 && <div className="upload-workflow-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default UploadPage;