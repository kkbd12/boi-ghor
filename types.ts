export interface Book {
  id: string; // Changed from number to string for UUID
  user_id?: string | null; // Made optional and nullable for public books
  title: string;
  author: string;
  coverImage: string;
  description: string;
  pdfUrl: string;
  summary?: string;
  authorIntro?: string;
  genre?: string;
  publicationYear?: number;
  pageCount?: number;
  rating?: number;
}
