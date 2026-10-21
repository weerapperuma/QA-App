import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Flame,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  ExternalLink,
  Save,
  RotateCcw,
  UploadCloud,
  HelpCircle,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function FirebaseConfigModal() {
  const {
    isFirebaseModalOpen,
    setIsFirebaseModalOpen,
    firebaseStatus,
    firebaseConfig,
    updateFirebaseConfig,
    disconnectFirebase,
    syncAllLocalDataToFirebase,
    addToast
  } = useApp();

  const [form, setForm] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [pasteSnippet, setPasteSnippet] = useState('');

  // Sync state when modal opens or config updates
  useEffect(() => {
    if (firebaseConfig) {
      setForm({
        apiKey: firebaseConfig.apiKey || '',
        authDomain: firebaseConfig.authDomain || '',
        projectId: firebaseConfig.projectId || '',
        storageBucket: firebaseConfig.storageBucket || '',
        messagingSenderId: firebaseConfig.messagingSenderId || '',
        appId: firebaseConfig.appId || ''
      });
    }
    setTestResult(null);
  }, [firebaseConfig, isFirebaseModalOpen]);

  if (!isFirebaseModalOpen) return null;

  const handleChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setTestResult(null);
  };

  // Helper to parse pasted JS config snippet e.g. const firebaseConfig = { apiKey: "...", ... }
  const handleParseSnippet = () => {
    if (!pasteSnippet.trim()) return;

    try {
      const extract = (key) => {
        const regex = new RegExp(`${key}["']?\\s*:\\s*["']([^"']+)["']`, 'i');
        const match = pasteSnippet.match(regex);
        return match ? match[1] : '';
      };

      const extracted = {
        apiKey: extract('apiKey'),
        authDomain: extract('authDomain'),
        projectId: extract('projectId'),
        storageBucket: extract('storageBucket'),
        messagingSenderId: extract('messagingSenderId'),
        appId: extract('appId')
      };

      if (extracted.apiKey || extracted.projectId) {
        setForm((prev) => ({ ...prev, ...extracted }));
        setPasteSnippet('');
        addToast('Extracted Firebase config fields from snippet!', 'success', 'Snippet Parsed');
      } else {
        addToast('Could not find Firebase config fields in the pasted text.', 'warning');
      }
    } catch (err) {
      addToast('Failed to parse pasted snippet.', 'critical');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const res = await updateFirebaseConfig(form);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      addToast('Connected to Firebase Firestore successfully!', 'success', 'Cloud Connected');
    } else {
      addToast(res.error || 'Failed to connect to Firebase', 'critical');
    }
  };

  const handleDisconnect = () => {
    disconnectFirebase();
    setTestResult(null);
    setForm({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    });
    addToast('Disconnected from Firebase. Reverted to Local Storage.', 'info');
  };

  const isConnected = firebaseStatus === 'connected';

  return (
    <div className="modal-backdrop" onClick={() => setIsFirebaseModalOpen(false)}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: isConnected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                color: isConnected ? '#f59e0b' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Flame size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Firebase Cloud Connection</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isConnected ? 'var(--status-verified)' : 'var(--status-critical)',
                    border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}
                >
                  {isConnected ? 'ONLINE • CLOUD SYNC' : 'OFFLINE • LOCAL STORAGE'}
                </span>
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Connect Firestore for live real-time synchronization of users, features, and QA defects.
              </p>
            </div>
          </div>

          <button className="btn-icon" onClick={() => setIsFirebaseModalOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status Banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
              borderColor: isConnected ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-medium)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            {isConnected ? (
              <CheckCircle2 size={18} color="var(--status-verified)" style={{ marginTop: '2px', flexShrink: 0 }} />
            ) : (
              <Cloud size={18} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: isConnected ? 'var(--status-verified)' : 'var(--text-primary)' }}>
                {isConnected
                  ? `Connected to Firestore Project: ${firebaseConfig?.projectId || 'Active'}`
                  : 'Currently operating in Local Storage mode'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isConnected
                  ? 'All changes to users, features, and bug reports are automatically synced to your Firebase Cloud Firestore in real-time across all teammates.'
                  : 'Data is safely stored locally in your browser. Enter your Firebase web credentials below to enable cloud synchronization.'}
              </div>
            </div>

            {isConnected && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={syncAllLocalDataToFirebase}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Upload all current local features, tickets, and accounts to your Firestore project"
              >
                <UploadCloud size={13} />
                <span>Push Local Data</span>
              </button>
            )}
          </div>

          {/* Test Result Alert */}
          {testResult && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid',
                background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'var(--status-critical-bg)',
                borderColor: testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'var(--status-critical-border)',
                color: testResult.success ? 'var(--status-verified)' : 'var(--status-critical)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>
                {testResult.success
                  ? (testResult.warning || 'Connection verified! Firebase is active and working.')
                  : testResult.error}
              </span>
            </div>
          )}

          {/* Quick Paste Snippet Helper */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ⚡ Quick Paste: Paste Firebase SDK Snippet
              </span>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-dev)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <HelpCircle size={13} />
                <span>{showGuide ? 'Hide Instructions' : 'How to get Firebase keys?'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder='Paste const firebaseConfig = { apiKey: "...", ... } here'
                value={pasteSnippet}
                onChange={(e) => setPasteSnippet(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleParseSnippet}
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}
              >
                Auto-Fill
              </button>
            </div>

            {/* Step by Step Guide */}
            {showGuide && (
              <div
                style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div><strong>1.</strong> Open <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-dev)' }}>Firebase Console</a> and create or select a project.</div>
                <div><strong>2.</strong> In <strong>Build &gt; Firestore Database</strong>, click <strong>Create Database</strong> (choose <em>Start in test mode</em>).</div>
                <div><strong>3.</strong> In <strong>Project Settings &gt; General &gt; Your Apps</strong>, click the Web icon <code>&lt;/&gt;</code> to register an app.</div>
                <div><strong>4.</strong> Copy the <code>firebaseConfig</code> values and paste them below or into the quick paste box above.</div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              {/* Project ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Project ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. devbridge-qa-track"
                  value={form.projectId}
                  onChange={(e) => handleChange('projectId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* API Key */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  API Key *
                </label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={form.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Auth Domain */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Auth Domain
                </label>
                <input
                  type="text"
                  placeholder="project-id.firebaseapp.com"
                  value={form.authDomain}
                  onChange={(e) => handleChange('authDomain', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Storage Bucket */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Storage Bucket
                </label>
                <input
                  type="text"
                  placeholder="project-id.appspot.com"
                  value={form.storageBucket}
                  onChange={(e) => handleChange('storageBucket', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Messaging Sender ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Messaging Sender ID
                </label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={form.messagingSenderId}
                  onChange={(e) => handleChange('messagingSenderId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* App ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  App ID
                </label>
                <input
                  type="text"
                  placeholder="1:1234567890:web:abcdef..."
                  value={form.appId}
                  onChange={(e) => handleChange('appId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <div>
                {isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', color: 'var(--status-critical)' }}
                  >
                    Disconnect & Use Local Storage
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsFirebaseModalOpen(false)}
                  style={{ fontSize: '0.82rem' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  {isTesting ? <span>Connecting...</span> : <span>Save & Connect Firebase</span>}
                  <Save size={14} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
