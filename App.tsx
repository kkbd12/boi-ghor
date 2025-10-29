import React, { useState, useEffect } from 'react';
import { Book } from './types';
import LibraryPage from './pages/LibraryPage';
import BookDetailPage from './pages/BookDetailPage';
import AddBookPage from './pages/AddBookPage';
import AuthComponent from './components/Auth';
import { GenerationType } from './services/geminiService';
import { getAllBooks, updateBook, addBook, deleteBook } from './services/dbService';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { LoadingSpinner } from './components/icons';

type View = 'library' | 'book-detail' | 'add-book' | 'admin-login';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('library');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' || (savedTheme === null && prefersDarkMode);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  // Fetch books publicly on initial load
  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAdmin(!!session);
       if (session && view === 'admin-login') {
        setView('library'); // Redirect to library if logged in and on login page
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAdmin(!!session);
      if (session && view === 'admin-login') {
        setView('library');
      }
      if (!session) {
         // If user signs out, ensure they are not on an admin-only page
         if (view === 'add-book') {
            setView('library');
         }
      }
    });

    return () => subscription.unsubscribe();
  }, [view]);


  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
    } catch (error) {
      console.error("Failed to fetch books:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const handleSelectBook = (id: string) => {
    setSelectedBookId(id);
    setView('book-detail');
  };
  const handleBackToLibrary = () => {
    setView('library');
    setSelectedBookId(null);
  };
  const handleAddBookClick = () => {
    if (isAdmin) {
      setView('add-book');
    } else {
      setView('admin-login');
    }
  };

  const handleAiUpdate = async (bookId: string, type: GenerationType, content: string) => {
    if (!isAdmin) return;
    const updatedBook = await updateBook(bookId, { [type]: content });
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
  };
  
  const handleRatingUpdate = async (bookId: string, rating: number) => {
    if (!isAdmin) return;
    const updatedBook = await updateBook(bookId, { rating });
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
  };

  const handleAddBook = async (newBookData: Omit<Book, 'id' | 'user_id' | 'description'> & { description?: string }) => {
    if (!isAdmin) return;
    
    const finalBookData = {
        ...newBookData,
        description: newBookData.description || '', // Use provided description or an empty string
    };
    const newBook = await addBook(finalBookData);
    setBooks(prev => [newBook, ...prev]);
    handleBackToLibrary();
  };
  
  const handleDeleteBook = async (bookId: string) => {
    if (!isAdmin) return;
    try {
        await deleteBook(bookId);
        setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
        handleBackToLibrary();
    } catch (error) {
        console.error('Error deleting book from App:', error);
        alert('Failed to delete book.');
    }
  };
  
  const selectedBook = books.find(book => book.id === selectedBookId);

  if (!supabase) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-red-50 text-red-800">
            <div className="text-center p-8 max-w-lg mx-auto bg-white rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
                <p className="mb-2">The Supabase client is not configured. Please check your setup.</p>
                <p>You need to add your Supabase URL and Key to the <code className="bg-red-100 p-1 rounded text-sm">services/supabaseClient.ts</code> file.</p>
            </div>
        </div>
    );
  }

  if (isLoading && books.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
         <div className="flex flex-col items-center">
            <LoadingSpinner className="w-12 h-12 text-amber-500 animate-spin mb-4" />
            <h2 className="text-2xl font-semibold text-stone-700 dark:text-stone-300">লাইব্রেরি লোড হচ্ছে...</h2>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'admin-login':
        return <AuthComponent onBack={handleBackToLibrary} />;
      case 'book-detail':
        return selectedBook ? (
          <BookDetailPage 
            book={selectedBook} 
            isAdmin={isAdmin} 
            onAiUpdate={handleAiUpdate} 
            onRatingUpdate={handleRatingUpdate} 
            onBack={handleBackToLibrary}
            onDeleteBook={handleDeleteBook}
          />
        ) : (
          <LibraryPage books={books} isAdmin={isAdmin} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} onSelectBook={handleSelectBook} onAddBookClick={handleAddBookClick} />
        );
      case 'add-book':
        return <AddBookPage onAddBook={handleAddBook} onBack={handleBackToLibrary} />;
      case 'library':
      default:
        return <LibraryPage books={books} isAdmin={isAdmin} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} onSelectBook={handleSelectBook} onAddBookClick={handleAddBookClick}/>;
    }
  };

  return (
    <div className={`min-h-screen bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300`}>
      {renderContent()}
    </div>
  );
};

export default App;