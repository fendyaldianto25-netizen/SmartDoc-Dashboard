import * as pdfjsLib from 'pdfjs-dist';

// Use Vite's asset handling for the worker
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Parallelize page extraction
    const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
      const page = await pdf.getPage(i + 1);
      const textContent = await page.getTextContent();
      return textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
    });

    const pages = await Promise.all(pagePromises);
    const fullText = pages.join('\n');

    if (!fullText.trim()) {
      throw new Error('No text could be extracted from this PDF. It might be an image-only PDF.');
    }

    return fullText;
  } catch (error) {
    console.error('PDF Extraction Error:', error);
    throw error;
  }
}
