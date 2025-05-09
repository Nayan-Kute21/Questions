"use client";
import { useState, useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

interface QuestionSection {
  topic: string;
  questions: string[];
}

export default function QuestionsPage() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [questionSections, setQuestionSections] = useState<QuestionSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' | null }>({ text: "", type: null });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async (newTopic?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const endpoint = `/api/questions${newTopic ? `?topic=${encodeURIComponent(newTopic)}` : ''}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();

      setQuestionSections(prevSections => [
        { topic: data.topic || 'general', questions: data.questions },
        ...prevSections.filter(section => section.topic !== (data.topic || 'general'))
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      fetchQuestions(topic.trim());
      setTopic("");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      setStatusMessage({ text: "Uploading PDF...", type: "info" });

      const formData = new FormData();
      formData.append('file', files[0]);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      setStatusMessage({
        text: `PDF uploaded successfully! ${result.chunks?.length || 0} chunks processed.`,
        type: "success"
      });

      fetchQuestions();
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setStatusMessage({
        text: error instanceof Error ? error.message : "Failed to upload PDF",
        type: "error"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocuments = async () => {
    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);
      setStatusMessage({ text: "Deleting documents...", type: "info" });

      const response = await fetch('/api/documents', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Deletion failed: ${response.statusText}`);
      }

      const result = await response.json();

      setStatusMessage({
        text: result.message || "Documents deleted successfully!",
        type: "success"
      });

      setQuestionSections([]);
    } catch (error) {
      console.error("Error deleting documents:", error);
      setStatusMessage({
        text: error instanceof Error ? error.message : "Failed to delete documents",
        type: "error"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const goToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 p-6 sm:p-10">
      <main className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1 rounded-full inline-block">
              <div className="bg-white dark:bg-gray-900 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            AI Question Bank
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Explore AI-generated questions from your uploaded documents. Add topics to generate specific questions 
            or manage your document collection with the tools below.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transform transition-transform hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
            >
              {isUploading ? (
                <>
                  <span className="h-5 w-5 relative">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="absolute h-5 w-5 rounded-full bg-white"></span>
                  </span>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Add PDF</span>
                </>
              )}
            </button>
            <button
              onClick={goToHome}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-green-500/20 transform transition-transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span>Home</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-red-500/20 transform transition-transform hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
            >
              {isDeleting ? (
                <>
                  <span className="h-5 w-5 relative">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="absolute h-5 w-5 rounded-full bg-white"></span>
                  </span>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Clear All</span>
                </>
              )}
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="application/pdf"
            onChange={handleFileUpload}
          />
          {statusMessage.text && statusMessage.type && (
            <div className={`mb-6 p-4 rounded-lg shadow-md ${
              statusMessage.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800" : 
              statusMessage.type === "error" ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800" : 
              "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
            } animate-fadeIn`}>
              <p className="flex items-center">
                {statusMessage.type === "success" && (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                )}
                {statusMessage.type === "error" && (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                  </svg>
                )}
                {statusMessage.type === "info" && (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"></path>
                  </svg>
                )}
                {statusMessage.text}
              </p>
            </div>
          )}
        </div>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Deletion</h3>
              <p className="mb-6 text-gray-700 dark:text-gray-300">
                Are you sure you want to remove all documents from the database? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDocuments}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
        {!isLoading && (
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate Topic-Specific Questions
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter a topic (e.g., 'machine learning', 'project management')"
                    className="pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!topic.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium shadow-md transition-all hover:shadow-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <span>Generate Questions</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </form>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-xl shadow-md mb-10 animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                  Error Generating Questions
                </h3>
                <div className="mt-2 text-md text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {!isLoading && questionSections.length > 0 && (
          <div className="space-y-8">
            {questionSections.map((section, sectionIndex) => (
              <div 
                key={`${section.topic}-${sectionIndex}`} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 transform transition hover:shadow-2xl"
              >
                <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
                  <div className="mr-3 p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {section.topic === 'general' ? 'General Questions' : `Questions about "${section.topic}"`}
                </h2>
                <ul className="space-y-4">
                  {section.questions.map((question, index) => (
                    <li 
                      key={index} 
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors shadow-sm hover:shadow-md"
                    >
                      <p className="text-gray-800 dark:text-gray-200 flex">
                        <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">{index + 1}.</span>
                        {question}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!isLoading && questionSections.length === 0 && (
          <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full inline-flex mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">No Questions Yet</h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
              Upload a document and enter a topic to generate insightful questions from your content.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg flex items-center gap-2 shadow-lg transform transition hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload PDF
              </button>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="text-center p-16 animate-fadeIn">
            <div className="relative mx-auto mb-8">
              <div className="w-24 h-24 border-4 border-blue-200 dark:border-blue-900/30 rounded-full mx-auto"></div>
              <div className="w-24 h-24 border-4 border-blue-600 dark:border-blue-500 border-t-transparent animate-spin rounded-full absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <p className="text-2xl text-blue-600 dark:text-blue-400 font-medium">
              Generating Questions...
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-md mx-auto">
              Our AI is analyzing your documents to create relevant questions tailored to your content.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
