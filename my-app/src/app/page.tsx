"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import Link from "next/link";  // Add this import for the Link component

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(
      file => file.type === 'application/pdf'
    );
    setUploadedFiles(prev => [...prev, ...pdfFiles]);
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const processDocuments = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsProcessing(true);
    setProcessingError(null);
    
    try {
      const results = await Promise.all(
        uploadedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          

          if (!response.ok) {
            throw new Error(`Failed to process ${file.name}`);
          }
          
          return await response.json();
        })
        
      );
      console.log("Processing results:", results);
      
      router.push('/Questions');
      
    } catch (error) {
      console.error("Error processing documents:", error);
      setProcessingError(error instanceof Error ? error.message : "Failed to process documents");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-6 sm:p-10 flex items-center justify-center">
      <main className="w-full max-w-5xl mx-auto">
        {/* Hero Section with updated title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            AI Question Generator
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Upload your documents and get AI-generated questions to deepen your understanding.
          </p>
          
          {/* Navigation button to Questions page */}
          <Link 
            href="/Questions"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 mb-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            View Questions
          </Link>
        </div>

        {/* Document Management Section - Side by side layout */}
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          {/* Upload Section with enhanced styling */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 flex-1">
            <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-4">
              Upload Documents
            </h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-300 min-h-[180px] flex items-center justify-center ${
                isDragActive 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]" 
                  : "border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {isDragActive ? "Drop your PDFs here" : "Drag & drop PDFs here"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  or click to browse your files
                </p>
              </div>
            </div>
          </div>

          {/* File List Section with better visuals */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 flex-1 ${
            uploadedFiles.length === 0 ? 'hidden md:flex md:flex-col md:justify-center md:items-center' : 'flex flex-col'
          }`}>
            {uploadedFiles.length > 0 ? (
              <>
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Uploaded Documents ({uploadedFiles.length})
                </h3>
                <ul className="space-y-3 mb-6 flex-1 overflow-y-auto max-h-[300px]">
                  {uploadedFiles.map((file, index) => (
                    <li 
                      key={`${file.name}-${index}`} 
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px] sm:max-w-[180px] md:max-w-[120px] lg:max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(index)}
                        className="p-1.5 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        aria-label="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <button 
                    className={`w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg shadow-blue-500/30 dark:shadow-blue-500/10 flex items-center justify-center space-x-2 transform transition-all hover:scale-[1.02] ${
                      isProcessing ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl'
                    }`}
                    onClick={processDocuments}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Questions</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No files selected yet</p>
                <p className="text-sm">Uploaded files will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message with improved styling */}
        {processingError && (
          <div className="animate-fade-in bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-10 border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                  Error Processing Documents
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{processingError}</p>
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => setProcessingError(null)}
                    className="text-sm text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
