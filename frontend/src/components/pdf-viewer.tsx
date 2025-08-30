"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// ✅ Dynamically import Document & Page so they never load on the server
const Document = dynamic(() => import("react-pdf").then(m => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then(m => m.Page), { ssr: false });

interface PdfViewerProps {
  fileUrl: string | null;
  page?: number;
}

export function PdfViewer({ fileUrl, page = 1 }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);

  // ✅ Load pdfjs only on client
  useEffect(() => {
  (async () => {
    const { pdfjs } = await import("react-pdf");
    // ✅ Use the local worker you copied into /public
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  })();
}, []);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    return () => {
      if (fileUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No PDF selected
      </div>
    );
  }

  return (
    <div className="flex justify-center h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      <Document file={fileUrl} onLoadSuccess={handleLoadSuccess}>
        <Page
          pageNumber={page}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
}
