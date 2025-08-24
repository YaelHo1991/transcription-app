// PDF to image converter without worker (simpler but slower)
export interface PDFPageImage {
  url: string;
  pageNumber: number;
  totalPages: number;
}

export async function convertPDFToImages(file: File): Promise<PDFPageImage[]> {
  try {
    // Dynamic import
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Set a dummy worker source to avoid the error
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'data:,';
    
    console.log('Loading PDF (no worker):', file.name);
    
    // Read file
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF without worker
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer
    } as any).promise;
    
    const totalPages = pdf.numPages;
    console.log('PDF loaded:', totalPages, 'pages');
    
    const images: PDFPageImage[] = [];
    
    // Convert each page
    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        
        // Lower scale for performance
        const scale = 1.2;
        const viewport = page.getViewport({ scale });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        } as any).promise;
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        images.push({
          url: dataUrl,
          pageNumber: i,
          totalPages: totalPages
        });
        
        console.log('Page ' + i + '/' + totalPages + ' converted');
        
        // Clean up
        page.cleanup();
      } catch (e) {
        console.error('Error on page', i, e);
      }
    }
    
    return images;
  } catch (error) {
    console.error('PDF Error:', error);
    throw new Error('Cannot process PDF: ' + (error as Error).message);
  }
}