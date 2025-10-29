import React, { useState } from 'react';
import BookCard from '../components/BookCard';
import { Book } from '../types';
import { PlusIcon, SunIcon, MoonIcon, SearchIcon, SignOutIcon } from '../components/icons';
import { supabase } from '../services/supabaseClient';

interface LibraryPageProps {
  books: Book[];
  isDarkMode: boolean;
  isAdmin: boolean;
  toggleDarkMode: () => void;
  onSelectBook: (id: string) => void;
  onAddBookClick: () => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ books, isDarkMode, isAdmin, toggleDarkMode, onSelectBook, onAddBookClick }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        {isAdmin && (
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Sign Out"
            >
              <SignOutIcon className="w-6 h-6" />
            </button>
        )}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
        </button>
      </div>
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white mt-12 md:mt-0">বই ঘর</h1>
        <p className="text-lg text-stone-600 dark:text-stone-400 mt-2">আপনার ডিজিটাল পাবলিক লাইব্রেরি</p>
        <div className="mt-6 flex justify-center items-center flex-wrap gap-4">
            <button 
              onClick={onAddBookClick}
              className="inline-flex items-center px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 transition-all duration-300 transform hover:-translate-y-1"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {isAdmin ? 'নতুন বই যোগ করুন' : 'অ্যাডমিন লগইন'}
            </button>
        </div>
      </header>

      <div className="mb-12 max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-stone-400" />
          </div>
          <input
            type="search"
            placeholder="বই বা লেখক খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 border border-stone-300 dark:border-stone-700 rounded-full bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <main>
        {books.length === 0 ? (
           <div className="text-center py-16">
            <p className="text-xl text-stone-500 dark:text-stone-400">এই লাইব্রেরিতে এখনো কোনো বই যোগ করা হয়নি।</p>
            {isAdmin && <p className="text-md text-stone-500 dark:text-stone-400 mt-2">নতুন বই যোগ করে শুরু করুন।</p>}
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} onSelect={onSelectBook} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-stone-500 dark:text-stone-400">"<strong>{searchQuery}</strong>" এর জন্য কোনো বই খুঁজে পাওয়া যায়নি।</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LibraryPage;
