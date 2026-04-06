import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadStatement } from '../services/api';

export default function UploadCard({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [toast, setToast] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadStatement(selectedFile, setProgress);
      setToast({ type: 'success', message: `Statement uploaded! ${res.data.total_transactions} transactions found.` });
      setSelectedFile(null);
      setProgress(0);
      if (onUploadSuccess) onUploadSuccess(res.data);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.detail || 'Upload failed' });
    } finally {
      setUploading(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.message}
          </div>
        </div>
      )}

      <div className="glass-card p-8">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          📤 Upload Bank Statement
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Upload your PDF bank statement to analyze transactions and get insights.
        </p>

        {/* Dropzone */}
        <div {...getRootProps()}
             className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300"
             style={{
               borderColor: isDragActive ? '#6366f1' : 'var(--border-color)',
               background: isDragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.5)',
             }}>
          <input {...getInputProps()} />
          <div className="text-4xl mb-3">{isDragActive ? '📂' : '📄'}</div>
          {selectedFile ? (
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedFile.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                {isDragActive ? 'Drop your PDF here...' : 'Drag & drop a PDF statement here'}
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                or click to browse • Supports SBI, HDFC, ICICI, Axis, Kotak
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="mt-4">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                   style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #06b6d4)' }} />
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              Uploading & parsing... {progress}%
            </p>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && !uploading && (
          <button onClick={handleUpload}
                  className="w-full mt-5 py-3 rounded-xl font-semibold text-white border-none cursor-pointer transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', fontSize: '15px' }}
                  onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.target.style.transform = 'translateY(0)'}>
            🚀 Upload & Parse Statement
          </button>
        )}
      </div>
    </>
  );
}
