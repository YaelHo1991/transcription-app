// Simpler PDF to image converter
export interface PDFPageImage {
  url: string;
  pageNumber: number;
  totalPages: number;
}

export async function convertPDFToImages(file: File): Promise<PDFPageImage[]> {
  try {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Use local worker file from public folder
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.js';
    
    console.log('Loading PDF file:', file.name);
    
    // Read file
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF with worker disabled as fallback
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer
    } as any);
    
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    
    console.log('PDF loaded with', totalPages, 'pages');
    
    const images: PDFPageImage[] = [];
    
    // Process each page
    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('No canvas context for page', i);
          continue;
        }
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render page
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        } as any).promise;
        
        // Convert to image
        const dataUrl = canvas.toDataURL('image/png');
        
        images.push({
          url: dataUrl,
          pageNumber: i,
          totalPages: totalPages
        });
        
        console.log('Converted page', i);
      } catch (pageError) {
        console.error('Error processing page', i, pageError);
      }
    }
    
    return images;
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error('Failed to process PDF: ' + (error as Error).message);
  }
}