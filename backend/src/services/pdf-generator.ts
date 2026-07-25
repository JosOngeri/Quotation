import jsPDF from 'jspdf';
import { Pool } from 'pg';

interface QuoteData {
  id: string;
  title: string;
  client_name: string;
  client_address?: string;
  client_email?: string;
  client_phone?: string;
  currency: string;
  valid_until: string;
  created_at: string;
  items: QuoteItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  notes?: string;
  terms?: string;
}

interface QuoteItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface WorkspaceData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export class PDFGenerator {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async generateQuotePDF(quoteId: string, workspaceId: string): Promise<Buffer> {
    try {
      // Fetch quote data
      const quoteData = await this.fetchQuoteData(quoteId, workspaceId);
      const workspaceData = await this.fetchWorkspaceData(workspaceId);

      // Create PDF
      const doc = new jsPDF();
      
      // Add company header
      this.addHeader(doc, workspaceData);
      
      // Add quote details
      this.addQuoteDetails(doc, quoteData);
      
      // Add line items table
      this.addLineItems(doc, quoteData.items);
      
      // Add totals
      this.addTotals(doc, quoteData);
      
      // Add terms and conditions
      if (quoteData.terms) {
        this.addTerms(doc, quoteData.terms);
      }
      
      // Add notes
      if (quoteData.notes) {
        this.addNotes(doc, quoteData.notes);
      }
      
      // Add footer
      this.addFooter(doc, workspaceData);

      // Generate buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private async fetchQuoteData(quoteId: string, workspaceId: string): Promise<QuoteData> {
    // Fetch quote header
    const quoteResult = await this.pool.query(
      `SELECT q.*, c.name as client_name, c.address as client_address, 
              c.email as client_email, c.phone as client_phone
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       WHERE q.id = $1 AND q.workspace_id = $2`,
      [quoteId, workspaceId]
    );

    if (quoteResult.rows.length === 0) {
      throw new Error('Quote not found');
    }

    const quote = quoteResult.rows[0];

    // Fetch quote items
    const itemsResult = await this.pool.query(
      `SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY created_at`,
      [quoteId]
    );

    const items: QuoteItem[] = itemsResult.rows.map(item => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price_minor / 100, // Convert from minor units
      total: item.total_minor / 100
    }));

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * 0.16; // 16% tax (adjust as needed)
    const total = subtotal + taxAmount;

    return {
      id: quote.id,
      title: quote.title,
      client_name: quote.client_name,
      client_address: quote.client_address,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      currency: quote.currency,
      valid_until: quote.valid_until,
      created_at: quote.created_at,
      items,
      subtotal,
      tax_amount: taxAmount,
      total,
      notes: quote.notes,
      terms: quote.terms
    };
  }

  private async fetchWorkspaceData(workspaceId: string): Promise<WorkspaceData> {
    const result = await this.pool.query(
      'SELECT * FROM workspaces WHERE id = $1',
      [workspaceId]
    );

    if (result.rows.length === 0) {
      throw new Error('Workspace not found');
    }

    const workspace = result.rows[0];
    return {
      name: workspace.name,
      address: workspace.address,
      phone: workspace.phone,
      email: workspace.email,
      logo: workspace.logo
    };
  }

  private addHeader(doc: jsPDF, workspace: WorkspaceData): void {
    // Company name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(workspace.name, 20, 20);

    // Company details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let yPosition = 30;
    if (workspace.address) {
      doc.text(workspace.address, 20, yPosition);
      yPosition += 5;
    }
    if (workspace.phone) {
      doc.text(`Phone: ${workspace.phone}`, 20, yPosition);
      yPosition += 5;
    }
    if (workspace.email) {
      doc.text(`Email: ${workspace.email}`, 20, yPosition);
      yPosition += 5;
    }

    // Add line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition + 5, 190, yPosition + 5);
  }

  private addQuoteDetails(doc: jsPDF, quote: QuoteData): void {
    const yPosition = 60;

    // Quote title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE', 150, yPosition);

    // Quote number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Quote #: ${quote.id.substring(0, 8).toUpperCase()}`, 150, yPosition + 8);
    doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 150, yPosition + 16);
    doc.text(`Valid Until: ${new Date(quote.valid_until).toLocaleDateString()}`, 150, yPosition + 24);

    // Client details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPosition + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.client_name, 20, yPosition + 18);
    
    let clientY = yPosition + 26;
    if (quote.client_address) {
      doc.text(quote.client_address, 20, clientY);
      clientY += 6;
    }
    if (quote.client_email) {
      doc.text(quote.client_email, 20, clientY);
      clientY += 6;
    }
    if (quote.client_phone) {
      doc.text(quote.client_phone, 20, clientY);
    }
  }

  private addLineItems(doc: jsPDF, items: QuoteItem[]): void {
    const startY = 110;
    const tableWidth = 170;
    const colWidths = [10, 60, 30, 30, 40];
    const rowHeight = 10;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, startY, tableWidth, rowHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 22, startY + 7);
    doc.text('Description', 35, startY + 7);
    doc.text('Quantity', 95, startY + 7);
    doc.text('Unit Price', 125, startY + 7);
    doc.text('Total', 155, startY + 7);

    // Table rows
    doc.setFont('helvetica', 'normal');
    let yPosition = startY + rowHeight;

    items.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPosition, tableWidth, rowHeight, 'F');
      }

      doc.text(`${index + 1}`, 22, yPosition + 7);
      doc.text(item.name.substring(0, 35), 35, yPosition + 7);
      doc.text(item.quantity.toString(), 95, yPosition + 7);
      doc.text(`${item.unit_price.toFixed(2)}`, 125, yPosition + 7);
      doc.text(`${item.total.toFixed(2)}`, 155, yPosition + 7);

      yPosition += rowHeight;
    });

    // Table border
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, startY, tableWidth, yPosition - startY);
  }

  private addTotals(doc: jsPDF, quote: QuoteData): void {
    const startY = 110 + (quote.items.length * 10) + 20;
    const xPosition = 130;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Subtotal
    doc.text('Subtotal:', xPosition, startY);
    doc.text(`${quote.subtotal.toFixed(2)} ${quote.currency}`, 170, startY, { align: 'right' });

    // Tax
    doc.text('Tax (16%):', xPosition, startY + 8);
    doc.text(`${quote.tax_amount.toFixed(2)} ${quote.currency}`, 170, startY + 8, { align: 'right' });

    // Total
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', xPosition, startY + 18);
    doc.text(`${quote.total.toFixed(2)} ${quote.currency}`, 170, startY + 18, { align: 'right' });
  }

  private addTerms(doc: jsPDF, terms: string): void {
    const startY = 250;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms and Conditions:', 20, startY);

    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(terms, 170);
    doc.text(lines, 20, startY + 8);
  }

  private addNotes(doc: jsPDF, notes: string): void {
    const startY = 270;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, startY);

    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(notes, 170);
    doc.text(lines, 20, startY + 8);
  }

  private addFooter(doc: jsPDF, workspace: WorkspaceData): void {
    const yPosition = 280;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    
    doc.text(`Generated by ${workspace.name} Quotation Management System`, 105, yPosition + 5, { align: 'center' });
    doc.text(`Page 1 of 1`, 105, yPosition + 10, { align: 'center' });
  }
}