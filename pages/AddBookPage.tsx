import React, { useState } from 'react';
import { Book } from '../types';
import { UploadIcon, LoadingSpinner, BookOpenIcon, ChevronLeftIcon } from '../components/icons';
import { getDocument } from 'pdfjs-dist';
import { extractBookInfoFromFile } from '../services/geminiService';
import { uploadFile } from '../services/dbService';

interface AddBookPageProps {
  onAddBook: (newBookData: Omit<Book, 'id' | 'user_id' | 'description'> & { description?: string }) => Promise<void>;
  onBack: () => void;
}

const AddBookPage: React.FC<AddBookPageProps> = ({ onAddBook, onBack }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [publicationYear, setPublicationYear] = useState<number | ''>('');
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    setError('');
    try {
      if (file.type.startsWith('image/')) {
        const base64Data = await fileToBase64(file);
        const info = await extractBookInfoFromFile({ mimeType: file.type, data: base64Data });
        if (info.title) setTitle(info.title);
        if (info.author) setAuthor(info.author);
        if (info.genre) setGenre(info.genre);
        if (info.publicationYear) setPublicationYear(info.publicationYear);

      } else if (file.type === 'application/pdf') {
        const pdfUrl = URL.createObjectURL(file);
        const pdf = await getDocument(pdfUrl).promise;
        setPageCount(pdf.numPages);
        
        const maxPages = Math.min(5, pdf.numPages);
        let textContent = '';
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map(item => ('str' in item ? item.str : '')).join(' ');
        }
        URL.revokeObjectURL(pdfUrl);
        if (textContent.trim()) {
            const info = await extractBookInfoFromFile({ text: textContent });
            if (info.title) setTitle(info.title);
            if (info.author) setAuthor(info.author);
            if (info.genre) setGenre(info.genre);
            if (info.publicationYear) setPublicationYear(info.publicationYear);
        }
      }
    } catch (e) {
      console.error("File analysis failed:", e);
      setError("তথ্য বের করা যায়নি। অনুগ্রহ করে নিজে পূরণ করুন।");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
      analyzeFile(file);
    } else {
      setCoverImageFile(null);
      setCoverImagePreview('');
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
       if (!title && !author) {
          analyzeFile(file);
       } else {
        (async () => {
            const pdfUrl = URL.createObjectURL(file);
            const pdf = await getDocument(pdfUrl).promise;
            setPageCount(pdf.numPages);
            URL.revokeObjectURL(pdfUrl);
        })();
       }
    } else {
      setPdfFile(null);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !coverImageFile || !pdfFile) {
      setError('অনুগ্রহ করে সব প্রয়োজনীয় ঘর পূরণ করুন এবং কভার ও PDF উভয়ই আপলোড করুন।');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const coverImageUrl = await uploadFile(coverImageFile, 'covers');
      const pdfUrl = await uploadFile(pdfFile, 'pdfs');
      
      await onAddBook({ 
          title, 
          author, 
          coverImage: coverImageUrl, 
          pdfUrl, 
          genre, 
          publicationYear: publicationYear || undefined, 
          pageCount: pageCount || undefined 
      });
    } catch (err) {
      console.error("Failed to add book:", err);
      setError('বই যোগ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };
  
  const isDisabled = isSubmitting || isAnalyzing;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
        <button onClick={onBack} className="inline-flex items-center px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-lg shadow-sm hover:bg-stone-300 dark:hover:bg-stone-600 transition-all duration-300 mb-6">
          <ChevronLeftIcon className="w-5 h-5 mr-2" />
          লাইব্রেরিতে ফিরে যান
        </button>
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">নতুন বই যোগ করুন</h1>
        <p className="text-lg text-stone-600 dark:text-stone-400 mt-2">প্রথমে কভার ছবি বা PDF আপলোড করুন</p>
      </header>
      <main>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-800 rounded-lg shadow-md p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">কভারের ছবি</label>
            <div className="mt-1 flex items-center space-x-4">
              <div className="flex-shrink-0 h-32 w-24 bg-stone-100 dark:bg-stone-700 rounded-md flex items-center justify-center">
                {coverImagePreview ? 
                  <img src={coverImagePreview} alt="Cover preview" className="h-32 w-24 object-cover rounded-md" /> : 
                  <BookOpenIcon className="h-12 w-12 text-stone-400" />
                }
              </div>
              <label htmlFor="cover-upload" className={`relative cursor-pointer rounded-md font-medium text-amber-600 hover:text-amber-500 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span>{coverImageFile ? 'Change cover' : 'Upload cover image'}</span>
                <input id="cover-upload" type="file" className="sr-only" onChange={handleCoverImageChange} accept="image/*" disabled={isDisabled} />
              </label>
            </div>
          </div>

          <div className="relative">
            <label htmlFor="title" className="block text-sm font-medium text-stone-700 dark:text-stone-300">বইয়ের নাম</label>
            <input
              type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
              required disabled={isDisabled}
            />
          </div>

          <div className="relative">
            <label htmlFor="author" className="block text-sm font-medium text-stone-700 dark:text-stone-300">লেখকের নাম</label>
            <input
              type="text" id="author" value={author} onChange={(e) => setAuthor(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
              required disabled={isDisabled}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="genre" className="block text-sm font-medium text-stone-700 dark:text-stone-300">ধরণ (ঐচ্ছিক)</label>
              <input type="text" id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50" disabled={isDisabled}/>
            </div>
            <div>
              <label htmlFor="publicationYear" className="block text-sm font-medium text-stone-700 dark:text-stone-300">প্রকাশের বছর (ঐচ্ছিক)</label>
              <input type="number" id="publicationYear" value={publicationYear} onChange={(e) => setPublicationYear(e.target.value ? parseInt(e.target.value) : '')} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50" disabled={isDisabled}/>
            </div>
            <div>
              <label htmlFor="pageCount" className="block text-sm font-medium text-stone-700 dark:text-stone-300">পৃষ্ঠা সংখ্যা (ঐচ্ছিক)</label>
              <input type="number" id="pageCount" value={pageCount} onChange={(e) => setPageCount(e.target.value ? parseInt(e.target.value) : '')} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50" disabled={isDisabled}/>
            </div>
          </div>

           <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">বইয়ের PDF ফাইল</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 dark:border-stone-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-stone-400" />
                <div className="flex text-sm text-stone-600 dark:text-stone-400">
                  <label htmlFor="file-upload" className={`relative cursor-pointer bg-white dark:bg-stone-800 rounded-md font-medium text-amber-600 hover:text-amber-500 focus-within:outline-none ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handlePdfFileChange} accept="application/pdf" disabled={isDisabled}/>
                  </label>
                </div>
                 {pdfFile && <p className="text-sm text-green-600 dark:text-green-400 mt-2">{pdfFile.name}</p>}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-400 disabled:cursor-not-allowed"
            >
              {isAnalyzing && <><LoadingSpinner className="w-5 h-5 mr-3 animate-spin" /><span>তথ্য বিশ্লেষণ করা হচ্ছে...</span></>}
              {isSubmitting && <><LoadingSpinner className="w-5 h-5 mr-3 animate-spin" /><span>বই যোগ করা হচ্ছে...</span></>}
              {!isAnalyzing && !isSubmitting && 'বই যোগ করুন'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddBookPage;