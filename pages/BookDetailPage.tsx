import React, { useState, useReducer, useCallback } from 'react';
import { Book } from '../types';
import { generateBookInfo, GenerationType } from '../services/geminiService';
import { ChevronLeftIcon, SparklesIcon, LoadingSpinner, PencilIcon, TrashIcon } from '../components/icons';
import PdfViewer from '../components/PdfViewer';
import StarRating from '../components/StarRating';

interface BookDetailPageProps {
  book: Book;
  isAdmin: boolean;
  onAiUpdate: (bookId: string, type: GenerationType, content: string) => void;
  onRatingUpdate: (bookId: string, rating: number) => void;
  onBack: () => void;
  onDeleteBook: (bookId: string) => Promise<void>;
}

type Tab = 'details' | 'summary' | 'authorIntro';

const BookDetailPage: React.FC<BookDetailPageProps> = ({ book, isAdmin, onAiUpdate, onRatingUpdate, onBack, onDeleteBook }) => {
  const [isReading, setIsReading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  
  const selectedBook = book;

  if (!selectedBook) {
    return <div>Book not found.</div>;
  }
  
  const handleTabClick = (tab: Tab) => {
    // Prevent switching tabs while content is being generated
    if (document.body.dataset.generating === 'true') return;
    setActiveTab(tab);
  };
  
  const handleDelete = async () => {
    if (!isAdmin) return;
    const isConfirmed = window.confirm(`আপনি কি "${selectedBook.title}" বইটি স্থায়ীভাবে মুছে ফেলতে চান? এই কাজটি ফিরিয়ে আনা যাবে না।`);
    if (isConfirmed) {
      try {
        await onDeleteBook(selectedBook.id);
        // Navigation is handled in App.tsx after state update
      } catch (error) {
        console.error("Failed to delete book:", error);
        alert("বইটি ডিলিট করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      {isReading && (
        <div className="fixed inset-0 bg-black/90 z-50 animate-fade-in">
          <PdfViewer bookId={selectedBook.id} pdfUrl={selectedBook.pdfUrl} onClose={() => setIsReading(false)} />
        </div>
      )}
      
      <button onClick={onBack} className="inline-flex items-center px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-lg shadow-sm hover:bg-stone-300 dark:hover:bg-stone-600 transition-all duration-300 mb-6">
        <ChevronLeftIcon className="w-5 h-5 mr-2" />
        লাইব্রেরিতে ফিরে যান
      </button>

      <div className="md:flex md:space-x-8">
        <div className="md:w-1/3 flex-shrink-0">
          <img 
            src={selectedBook.coverImage} 
            alt={`Cover of ${selectedBook.title}`} 
            className="rounded-lg shadow-2xl w-full"
          />
          <button 
            onClick={() => setIsReading(true)}
            className="mt-6 w-full py-3 px-4 bg-amber-600 text-white font-bold rounded-lg shadow-md hover:bg-amber-700 transition-all duration-300 text-lg"
          >
            বইটি পড়ুন
          </button>
           {isAdmin && (
            <button
              onClick={handleDelete}
              className="mt-4 w-full flex justify-center items-center py-3 px-4 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all duration-300"
            >
              <TrashIcon className="w-5 h-5 mr-2" />
              বইটি ডিলিট করুন
            </button>
          )}
        </div>

        <div className="md:w-2/3 mt-6 md:mt-0">
          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-white">{selectedBook.title}</h1>
          <h2 className="text-xl text-stone-600 dark:text-stone-400 mt-1">{selectedBook.author}</h2>
          
          <div className="mt-4">
            <StarRating
              rating={selectedBook.rating || 0}
              onRatingChange={(newRating) => onRatingUpdate(selectedBook.id, newRating)}
              disabled={!isAdmin}
            />
          </div>

          <div className="border-b border-stone-200 dark:border-stone-700 mt-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button onClick={() => handleTabClick('details')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>বিস্তারিত</button>
              <button onClick={() => handleTabClick('summary')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'summary' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>সার সংক্ষেপ</button>
              <button onClick={() => handleTabClick('authorIntro')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'authorIntro' ? 'border-amber-500 text-amber-600' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>লেখক পরিচিতি</button>
            </nav>
          </div>
          
          <div className="py-6">
            {activeTab === 'details' && <DetailsTab book={selectedBook} onAiUpdate={onAiUpdate} isAdmin={isAdmin} />}
            {activeTab === 'summary' && <AiContentTab book={selectedBook} type="summary" title="সার সংক্ষেপ" onAiUpdate={onAiUpdate} isAdmin={isAdmin} />}
            {activeTab === 'authorIntro' && <AiContentTab book={selectedBook} type="authorIntro" title="লেখক পরিচিতি" onAiUpdate={onAiUpdate} isAdmin={isAdmin} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailsTab: React.FC<{ book: Book; isAdmin: boolean; onAiUpdate: BookDetailPageProps['onAiUpdate'] }> = ({ book, isAdmin, onAiUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedDescription, setEditedDescription] = useState(book.description);

    const handleSave = () => {
        onAiUpdate(book.id, 'description', editedDescription);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedDescription(book.description);
        setIsEditing(false);
    };
    
    const DetailItem: React.FC<{ label: string, value?: string | number }> = ({ label, value }) => {
        if (!value && value !== 0) return null;
        return (
             <div>
                <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</dt>
                <dd className="mt-1 text-base font-semibold text-stone-800 dark:text-stone-200">{value}</dd>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {isEditing ? (
                <div>
                    <label htmlFor="description-editor" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Edit Description</label>
                    <textarea
                        id="description-editor"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full h-40 p-2 border border-stone-300 dark:border-stone-600 rounded-md bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        aria-label="Edit book description"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                        <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-700 rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors">Save Changes</button>
                    </div>
                </div>
            ) : (
                <div>
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed">{book.description}</p>
                    {isAdmin && (
                        <button onClick={() => setIsEditing(true)} className="inline-flex items-center mt-2 text-sm text-amber-600 hover:underline">
                            <PencilIcon className="w-4 h-4 mr-1" />
                            Edit Description
                        </button>
                    )}
                </div>
            )}
            <dl className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 border-t border-stone-200 dark:border-stone-700 pt-6">
                <DetailItem label="ধরণ" value={book.genre} />
                <DetailItem label="প্রকাশকাল" value={book.publicationYear} />
                <DetailItem label="পৃষ্ঠা সংখ্যা" value={book.pageCount} />
            </dl>
        </div>
    );
};


interface AiContentTabProps {
  book: Book;
  type: 'summary' | 'authorIntro';
  title: string;
  isAdmin: boolean;
  onAiUpdate: (bookId: string, type: GenerationType, content: string) => void;
}

// Reducer to manage complex state for AI generation
type State = {
  content: string | null;
  isLoading: boolean;
  error: string | null;
};
type Action = 
  | { type: 'START_GENERATION' }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

const initialState: State = { content: null, isLoading: false, error: null };

function aiContentReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_GENERATION':
      return { ...state, isLoading: true, error: null };
    case 'SET_CONTENT':
      return { ...state, content: action.payload, isLoading: false };
    case 'SET_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'RESET':
      return { ...initialState, content: state.content };
    default:
      return state;
  }
}

const AiContentTab: React.FC<AiContentTabProps> = ({ book, type, title, onAiUpdate, isAdmin }) => {
  const [state, dispatch] = useReducer(aiContentReducer, { 
    ...initialState, 
    content: book[type] || null 
  });

  const handleGenerate = useCallback(async () => {
    dispatch({ type: 'START_GENERATION' });
    document.body.dataset.generating = 'true'; // Disable tab switching
    try {
      const generatedContent = await generateBookInfo(book.title, book.author, type);
      onAiUpdate(book.id, type, generatedContent);
      dispatch({ type: 'SET_CONTENT', payload: generatedContent });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || `Failed to generate ${type}.` });
      // Reset error after a delay to allow user to try again
      setTimeout(() => dispatch({ type: 'RESET' }), 4000);
    } finally {
       delete document.body.dataset.generating;
    }
  }, [book.id, book.title, book.author, type, onAiUpdate]);

  return (
    <div>
      {state.content ? (
        <div className="space-y-4">
          <p className="text-stone-600 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{state.content}</p>
           {isAdmin && (
              <p className="text-xs text-stone-400 dark:text-stone-500">
                AI দ্বারা তৈরি। গুরুত্বপূর্ণ তথ্য যাচাই করে নিন।
              </p>
           )}
        </div>
      ) : (
        <>
          {isAdmin ? (
            <>
              {state.error && <p className="text-red-500 mb-4 text-sm" role="alert">{state.error}</p>}
              <button
                onClick={handleGenerate}
                disabled={state.isLoading}
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 transition-all duration-300 disabled:bg-amber-400 disabled:cursor-wait"
              >
                {state.isLoading ? (
                  <>
                    <LoadingSpinner className="w-5 h-5 mr-2 animate-spin" />
                    জেনারেট হচ্ছে...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    {title} তৈরি করুন
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="text-stone-500 dark:text-stone-400">এই বইটির জন্য এখনো কোনো {title} যোগ করা হয়নি।</p>
          )}
        </>
      )}
    </div>
  );
};

export default BookDetailPage;