import React from 'react';
import { Book } from '../types';
import { StarIcon } from './icons';

interface BookCardProps {
  book: Book;
  onSelect: (id: string) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onSelect }) => {
  return (
    <div onClick={() => onSelect(book.id)} className="group block cursor-pointer">
      <div className="bg-white dark:bg-stone-800 rounded-lg shadow-md overflow-hidden transform transition-all duration-300 ease-in-out group-hover:shadow-xl group-hover:-translate-y-2">
        <img
          src={book.coverImage}
          alt={`Cover of ${book.title}`}
          className="w-full h-72 object-cover"
        />
        <div className="p-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white truncate" title={book.title}>
            {book.title}
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-400">{book.author}</p>
          {book.rating && book.rating > 0 ? (
            <div className="flex items-center mt-2">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-4 h-4 ${
                    i < book.rating! ? 'text-amber-400' : 'text-stone-300 dark:text-stone-600'
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="h-6" /> // Placeholder to keep card height consistent
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;