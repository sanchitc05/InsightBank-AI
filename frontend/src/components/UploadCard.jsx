import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadStatement } from '../hooks/useStatements';

export default function UploadCard({ onUploadSuccess }) {
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const { mutate: upload, isPending: uploading } = useUploadStatement();

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
  });

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
        if (onUploadSuccess) onUploadSuccess(res.data);
      }
    });
  };
  return (
    <div className="glass-card p-8 border-none bg-slate-900/40">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          <span className="text-gradient">Upload Statement</span>
        </h2>
        <p className="text-slate-400 text-sm">
          Upload your PDF bank statement to analyze transactions and get insights.
        </p>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()}
           className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-500 group relative overflow-hidden ${
             isDragActive 
               ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)]' 
               : 'border-white/10 bg-slate-800/20 hover:border-indigo-500/30 cursor-pointer'
           }`}>
        <input {...getInputProps()} />
        
        <div className={`text-5xl mb-4 transition-transform duration-500 ${isDragActive ? 'scale-110 -translate-y-1' : 'group-hover:scale-110'}`}>
          {isDragActive ? '📂' : '📄'}
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
              {isDragActive ? 'Drop to upload' : 'Select a PDF statement'}
            </p>
            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
              Drag & drop or click to browse. Supports SBI, HDFC, ICICI, Axis, Kotak and more.
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Processing...</span>
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
                className="w-full mt-8 premium-button py-4 text-base shadow-xl">
          🚀 Analyze Statement
        </button>
      )}
    </div>
  );
}
