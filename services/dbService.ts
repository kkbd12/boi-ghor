import { supabase } from './supabaseClient';
import { Book } from '../types';

export const getAllBooks = async (): Promise<Book[]> => {
  if (!supabase) throw new Error("Supabase client not initialized.");

  // RLS will handle public read access.
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching books:', error.message);
    throw error;
  }
  return data || [];
};

export const addBook = async (bookData: Omit<Book, 'id' | 'user_id'>): Promise<Book> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to add a book.");

  const newBook = { ...bookData, user_id: user.id };

  const { data, error } = await supabase
    .from('books')
    .insert(newBook)
    .select()
    .single();

  if (error) {
    console.error('Error adding book:', error);
    throw error;
  }
  return data;
};

export const updateBook = async (bookId: string, updates: Partial<Book>): Promise<Book> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  const { data, error } = await supabase
    .from('books')
    .update(updates)
    .eq('id', bookId)
    .select()
    .single();

  if (error) {
    console.error('Error updating book:', error);
    throw error;
  }
  return data;
};

export const deleteBook = async (bookId: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase client not initialized.");

    // 1. Get the book record to find the file URLs
    const { data: book, error: fetchError } = await supabase
        .from('books')
        .select('coverImage, pdfUrl')
        .eq('id', bookId)
        .single();

    if (fetchError) {
        console.error('Error fetching book for deletion:', fetchError.message);
        throw new Error(`Failed to fetch book details before deleting: ${fetchError.message}`);
    }

    if (!book) {
        console.warn(`Book with id ${bookId} not found for deletion.`);
        return; // Or throw an error if this should not happen
    }

    // 2. Delete files from storage
    const getPathFromUrl = (url: string, bucket: string): string | null => {
        try {
            const urlObject = new URL(url);
            const pathParts = urlObject.pathname.split(`/${bucket}/`);
            return pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : null;
        } catch (e) {
            console.error(`Invalid URL for storage file: ${url}`, e);
            return null;
        }
    };

    const filePromises = [];
    const coverPath = getPathFromUrl(book.coverImage, 'covers');
    if (coverPath) {
        filePromises.push(supabase.storage.from('covers').remove([coverPath]));
    }
    const pdfPath = getPathFromUrl(book.pdfUrl, 'pdfs');
    if (pdfPath) {
        filePromises.push(supabase.storage.from('pdfs').remove([pdfPath]));
    }

    const results = await Promise.all(filePromises);
    results.forEach(result => {
        if (result.error) {
            console.error('Error deleting file from storage:', result.error.message);
            // Throw an error to stop the process if a file fails to delete
            throw new Error(`Failed to delete file from storage: ${result.error.message}`);
        }
    });


    // 3. Delete the book record from the database ONLY if file deletion was successful
    const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

    if (deleteError) {
        console.error('Error deleting book record:', deleteError.message);
        throw new Error(`Failed to delete book record: ${deleteError.message}`);
    }
};


// Helper function to sanitize filenames for safe URL/storage key usage.
const sanitizeFileName = (name: string): string => {
  // Replaces spaces and other problematic characters with underscores.
  return name.replace(/[^a-zA-Z0-9.\-_\u0980-\u09FF]/g, '_');
};


export const uploadFile = async (file: File, bucket: 'covers' | 'pdfs'): Promise<string> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to upload files.");
  
  const sanitizedFileName = sanitizeFileName(file.name);
  const filePath = `public/${Date.now()}_${sanitizedFileName}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, file);

  if (error) {
    console.error(`Error uploading to ${bucket}:`, error);
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};