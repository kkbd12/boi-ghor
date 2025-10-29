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

export const uploadFile = async (file: File, bucket: 'covers' | 'pdfs'): Promise<string> => {
  if (!supabase) throw new Error("Supabase client not initialized.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to upload files.");
  
  // Use a more generic path or user-specific if preferred, but simpler is better for single admin
  const fileName = `public/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file);

  if (error) {
    console.error(`Error uploading to ${bucket}:`, error);
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
};
