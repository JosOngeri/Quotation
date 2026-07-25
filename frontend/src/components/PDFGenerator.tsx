import React, { useState } from 'react';
import axios from 'axios';

interface PDFGeneratorProps {
  quoteId: string;
  quoteTitle?: string;
  onGenerated?: (success: boolean) => void;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  quoteId,
  quoteTitle = 'Quote',
  onGenerated
}) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await axios.get(`/api/v1/quotes/${quoteId}/pdf`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quoteTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${quoteId.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onGenerated?.(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to generate PDF';
      setError(errorMessage);
      onGenerated?.(false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="pdf-generator">
      <button
        onClick={handleGeneratePDF}
        disabled={generating}
        className="generate-pdf-btn"
        title="Generate PDF"
      >
        {generating ? 'Generating...' : '📄 Generate PDF'}
      </button>
      
      {error && (
        <div className="pdf-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default PDFGenerator;