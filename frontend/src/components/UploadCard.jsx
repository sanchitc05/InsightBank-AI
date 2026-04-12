import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadStatement } from '../hooks/useStatements';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function UploadCard({ onUploadSuccess }) {
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [processedId, setProcessedId] = useState(null);
  
  const { mutate: upload, isPending: uploading } = useUploadStatement();

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false,
  });

  // Polling for processing status
  useEffect(() => {
    let interval;
    if (isProcessing && processedId) {
      interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API_BASE_URL}/statements/${processedId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const status = response.data.status;
          setProcessingStatus(status);
          
          if (status === 'SUCCESS' || status === 'FAILED') {
            setIsProcessing(false);
            clearInterval(interval);
            if (onUploadSuccess) onUploadSuccess(response.data);
          }
        } catch (error) {
          console.error('Polling error:', error);
          setIsProcessing(false);
          clearInterval(interval);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isProcessing, processedId, onUploadSuccess]);

  const handleUpload = () => {
    if (!selectedFile) return;
    setProgress(0);
    upload({ 
      file: selectedFile, 
      onProgress: setProgress 
    }, {
      onSuccess: (res) => {
        setSelectedFile(null);
        setProgress(0);
        setProcessedId(res.statement_id);
        setIsProcessing(true);
        setProcessingStatus('PENDING');
      },
      onError: () => {
        setProgress(0);
        setIsProcessing(false);
      }
    });
  };

  return (
    <div className={`glass-card p-8 border-none transition-all duration-700 ${isProcessing ? 'analyzing-glow scale-[1.02]' : 'bg-slate-900/40'}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          <span className="text-gradient">
            {isProcessing ? 'Analyzing Data...' : 'Upload Statement'}
          </span>
        </h2>
        <p className="text-slate-400 text-sm">
          {isProcessing 
            ? 'We are extracting and categorizing your transactions. This might take a moment.' 
            : 'Upload your PDF or CSV bank statement to analyze transactions and get insights.'}
        </p>
      </div>

      {!isProcessing ? (
        <>
          {/* Dropzone */}
          <div {...getRootProps()}
               className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-500 group relative overflow-hidden ${
                 isDragActive 
                   ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)]' 
                   : 'border-white/10 bg-slate-800/20 hover:border-indigo-500/30 cursor-pointer'
               }`}>
            <input {...getInputProps()} />
            
            <div className={`text-5xl mb-4 transition-transform duration-500 ${isDragActive ? 'scale-110 -translate-y-1' : 'group-hover:scale-110'}`}>
              {isDragActive ? '📂' : selectedFile?.name?.endsWith('.csv') ? '📊' : '📄'}
            </div>

            {selectedFile ? (
              <div>
                <p className="font-bold text-white text-lg mb-1">{selectedFile.name}</p>
                <p className="text-slate-500 text-xs font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-white font-semibold text-lg mb-2">
                  {isDragActive ? 'Drop to upload' : 'Select a PDF/CSV statement'}
                </p>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Drag & drop or click to browse. Supports PDF & CSV formats.
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Uploading...</span>
                <span className="text-xs font-mono text-slate-400">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                <div className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"
                     style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && !uploading && (
            <button onClick={handleUpload}
                    className="w-full mt-8 premium-button py-4 text-base shadow-xl group">
              🚀 Analyze Statement
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          )}
        </>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border-t-4 border-l-4 border-indigo-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
              🔍
            </div>
          </div>
          <p className="text-xl font-bold text-white mb-2">Processing Statement</p>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-xs font-mono text-indigo-300 uppercase tracking-widest">
              Status: {processingStatus}
            </span>
          </div>
          <p className="mt-6 text-slate-400 text-xs max-w-xs italic">
            Parsing transactions, identifying merchants, and applying AI categories...
          </p>
        </div>
      )}
    </div>
  );
}
