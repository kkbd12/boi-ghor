import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDocument, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  ChevronLeftIcon, ChevronRightIcon, LoadingSpinner, ZoomInIcon, ZoomOutIcon,
  BookmarkIcon, BookOpenIcon, CloseIcon
} from './icons';

interface PdfViewerProps {
  bookId: string;
  pdfUrl: string;
  onClose: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ bookId, pdfUrl, onClose }) => {
  const canvasLeftRef = useRef<HTMLCanvasElement>(null);
  const canvasRightRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Refs to hold the current rendering tasks
  const renderTaskLeftRef = useRef<RenderTask | null>(null);
  const renderTaskRightRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    const checkIsMobile = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const getBookmark = () => {
    try {
      const item = localStorage.getItem(`bookmark-${bookId}`);
      const page = item ? parseInt(item, 10) : 1;
      return isNaN(page) ? 1 : page;
    } catch (error) {
      console.warn("Could not read bookmark from localStorage", error);
      return 1;
    }
  };
  
  const toggleBookmark = () => {
    try {
      const key = `bookmark-${bookId}`;
      const bookmarked = localStorage.getItem(key) !== null;
      if (bookmarked) {
        localStorage.removeItem(key);
        setIsBookmarked(false);
      } else {
        localStorage.setItem(key, currentPage.toString());
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("Failed to update bookmark:", error);
    }
  };

  const fitToScreen = useCallback(() => {
    if (!viewerRef.current || !pdf) return;

    pdf.getPage(1).then(page => {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = viewerRef.current?.clientWidth || window.innerWidth;
      const containerHeight = viewerRef.current?.clientHeight || window.innerHeight;
      
      let totalWidth = viewport.width;
      // For desktop, calculate spread width unless it's the cover
      if (!isMobileView) {
        const isCoverPage = currentPage === 1;
        totalWidth = isCoverPage || pdf.numPages === 1 ? viewport.width : viewport.width * 2;
      }

      const scaleX = (containerWidth * 0.95) / totalWidth;
      const scaleY = (containerHeight * 0.95) / viewport.height;

      setZoom(Math.min(scaleX, scaleY));
    });
  }, [pdf, isMobileView, currentPage]);

  useEffect(() => {
    const loadPdf = async () => {
      setIsLoading(true);
      setError('');
      try {
        const loadingTask = getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setCurrentPage(getBookmark());
      } catch (error) {
        console.error('Error loading PDF:', error);
        setError('Failed to load PDF file.');
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [pdfUrl, bookId]);

  useEffect(() => {
    if (pdf) {
      fitToScreen();
    }
  }, [pdf, fitToScreen]);

  useEffect(() => {
    const handleResize = () => fitToScreen();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdf, fitToScreen]);
  
  useEffect(() => {
    setIsBookmarked(getBookmark() === currentPage);
  }, [currentPage, bookId]);

  useEffect(() => {
    if (!pdf) return;

    const renderPage = async (
      canvasRef: React.RefObject<HTMLCanvasElement>,
      pageNumber: number | null,
      taskRef: React.MutableRefObject<RenderTask | null>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Cancel any previous render task for this canvas
      if (taskRef.current) {
        taskRef.current.cancel();
      }

      if (!pageNumber || pageNumber > pdf.numPages) {
        const context = canvas.getContext('2d');
        context?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom });
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: context, viewport: viewport };
        taskRef.current = page.render(renderContext as any);
        await taskRef.current.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Failed to render page ${pageNumber}`, err);
          setError(`Failed to render page ${pageNumber}`);
        }
      } finally {
          taskRef.current = null;
      }
    };

    setIsLoading(true);

    const leftPageNumber = isMobileView ? null : (currentPage === 1 ? null : currentPage);
    const rightPageNumber = isMobileView ? currentPage : (currentPage === 1 ? 1 : currentPage + 1);

    Promise.all([
      renderPage(canvasLeftRef, leftPageNumber, renderTaskLeftRef),
      renderPage(canvasRightRef, rightPageNumber, renderTaskRightRef)
    ]).finally(() => {
      setIsLoading(false);
    });

    return () => {
      if (renderTaskLeftRef.current) {
        renderTaskLeftRef.current.cancel();
      }
      if (renderTaskRightRef.current) {
        renderTaskRightRef.current.cancel();
      }
    };
  }, [pdf, currentPage, zoom, isMobileView]);

  const isFirstPage = currentPage <= 1;
  const isLastPage = isMobileView ? currentPage >= numPages : currentPage >= numPages - 1;

  const goToPreviousPage = useCallback(() => {
    if (isFirstPage) return;
    const newPage = isMobileView ? currentPage - 1 : (currentPage === 2 ? 1 : Math.max(1, currentPage - 2));
    setCurrentPage(newPage);
  }, [currentPage, isFirstPage, isMobileView]);

  const goToNextPage = useCallback(() => {
    if (isLastPage) return;
    const newPage = isMobileView ? currentPage + 1 : (currentPage === 1 ? 2 : Math.min(numPages, currentPage + 2));
    setCurrentPage(newPage);
  }, [currentPage, numPages, isLastPage, isMobileView]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        goToNextPage();
      } else if (event.key === 'ArrowLeft') {
        goToPreviousPage();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToNextPage, goToPreviousPage]);

  const handleZoomIn = () => setZoom(prev => prev * 1.2);
  const handleZoomOut = () => setZoom(prev => prev / 1.2);
  
  if (error && !pdf) {
    return (
        <div className="flex justify-center items-center h-full flex-col">
            <p className="text-center py-10 text-red-400" role="alert">{error}</p>
            <button onClick={onClose} className="text-white bg-red-500 px-4 py-2 rounded" aria-label="Close viewer">Close</button>
        </div>
    );
  }
  
  if (!pdf) {
    return (
      <div className="absolute inset-0 bg-stone-900/50 flex justify-center items-center z-30" role="status" aria-label="Loading PDF">
        <LoadingSpinner className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div ref={viewerRef} className="w-full h-full flex flex-col items-center justify-center relative">
       {isLoading && (
         <div className="absolute inset-0 bg-stone-900/20 flex justify-center items-center z-30" role="status" aria-label="Rendering page">
            <LoadingSpinner className="w-12 h-12 text-amber-500 animate-spin" />
         </div>
       )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm p-2 rounded-full flex items-center space-x-2 z-20 text-white" role="toolbar" aria-label="PDF Viewer Controls">
        <button onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom Out" className="p-2 hover:bg-white/20 rounded-full"><ZoomOutIcon className="w-6 h-6" /></button>
        <span className="w-16 text-center tabular-nums" aria-live="polite">{(zoom * 100).toFixed(0)}%</span>
        <button onClick={handleZoomIn} title="Zoom In" aria-label="Zoom In" className="p-2 hover:bg-white/20 rounded-full"><ZoomInIcon className="w-6 h-6" /></button>
        <button onClick={fitToScreen} title="Fit to Screen" aria-label="Fit to Screen" className="p-2 hover:bg-white/20 rounded-full"><BookOpenIcon className="w-6 h-6" /></button>
        <button onClick={toggleBookmark} title="Bookmark" aria-label="Toggle bookmark" aria-pressed={isBookmarked} className={`p-2 hover:bg-white/20 rounded-full ${isBookmarked ? 'text-amber-400 fill-current' : ''}`}><BookmarkIcon className="w-6 h-6" /></button>
      </div>

      <button onClick={onClose} title="Close" aria-label="Close PDF viewer" className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-white/20 z-20"><CloseIcon className="w-6 h-6" /></button>

      {!isFirstPage && <button onClick={goToPreviousPage} aria-label="Go to previous page" className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-white/20 z-20 disabled:opacity-0" disabled={isLoading}><ChevronLeftIcon className="w-8 h-8" /></button>}

      <div className="flex-grow flex items-center justify-center w-full h-full overflow-auto">
        <div className="flex items-center justify-center p-4">
          <canvas ref={canvasLeftRef} className={!isMobileView && currentPage > 1 ? "shadow-lg" : "hidden"} />
          <canvas ref={canvasRightRef} className="shadow-lg" />
        </div>
      </div>

      {!isLastPage && <button onClick={goToNextPage} aria-label="Go to next page" className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-white/20 z-20 disabled:opacity-0" disabled={isLoading}><ChevronRightIcon className="w-8 h-8" /></button>}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-1 rounded-full z-20 text-white text-sm" aria-live="polite">
        {isMobileView || currentPage === 1 
            ? `Page ${currentPage} of ${numPages}` 
            : `Pages ${currentPage}-${Math.min(currentPage + 1, numPages)} of ${numPages}`}
      </div>
    </div>
  );
};

export default PdfViewer;