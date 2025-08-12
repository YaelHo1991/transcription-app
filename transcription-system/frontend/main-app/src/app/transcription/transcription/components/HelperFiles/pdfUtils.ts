// Simple PDF to image converter using PDF.js
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use the bundled worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.js`;
}

export interface PDFPageImage {
  url: string;
  pageNumber: number;
  totalPages: number;
}

export async function convertPDFToImages(file: File): Promise<PDFPageImage[]> {
  try {
    console.log('Starting PDF conversion for file:', file.name);
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded, size:', arrayBuffer.byteLength);
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    console.log('PDF loaded, total pages:', totalPages);
    
    const images: PDFPageImage[] = [];
    
    // Convert each page to image
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${totalPages}`);
      const page = await pdf.getPage(pageNum);
      
      // Set scale for good quality snapshots
      const scale = 1.5; // Reduced scale to avoid memory issues
      const viewport = page.getViewport({ scale });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Failed to get canvas context for page', pageNum);
        continue;
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      console.log(`Page ${pageNum} rendered to canvas`);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.9);
      });
      
      if (blob) {
        const url = URL.createObjectURL(blob);
        images.push({
          url,
          pageNumber: pageNum,
          totalPages
        });
        console.log(`Page ${pageNum} converted to image`);
      } else {
        console.error('Failed to create blob for page', pageNum);
      }
      
      // Clean up
      page.cleanup();
    }
    
    console.log('PDF conversion complete, total images:', images.length);
    return images;
  } catch (error) {
    console.error('Detailed error converting PDF:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}