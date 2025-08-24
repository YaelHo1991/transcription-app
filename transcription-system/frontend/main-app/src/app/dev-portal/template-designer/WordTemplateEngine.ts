import { 
  Document, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel,
  TabStopPosition, 
  TabStopType, 
  Packer, 
  UnderlineType,
  PageOrientation,
  PageMargin,
  PageSize,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  ShadingType,
  IParagraphOptions,
  IRunOptions,
  convertInchesToTwip,
  convertMillimetersToTwip,
  ImageRun,
  IStylesOptions,
  INumberingOptions,
  LevelFormat,
  AlignmentType as NumberAlignment
} from 'docx';
import { saveAs } from 'file-saver';

export interface TemplateStyle {
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'right' | 'center' | 'justify';
  lineSpacing?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  indent?: number;
  hangingIndent?: number;
  firstLineIndent?: number;
  border?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    color?: string;
    width?: number;
    style?: 'single' | 'double' | 'dotted' | 'dashed';
  };
  numbering?: {
    reference?: string;
    level?: number;
  };
  bullets?: boolean;
}

export interface TemplateSection {
  id: string;
  type: 'header' | 'footer' | 'title' | 'subtitle' | 'speakers' | 'content' | 'table' | 'pageBreak';
  content?: string;
  style?: TemplateStyle;
  table?: {
    rows: number;
    columns: number;
    headers?: boolean;
    borders?: boolean;
    shading?: boolean;
  };
  pageNumber?: {
    format: 'decimal' | 'roman' | 'alphabetic';
    position: 'left' | 'center' | 'right';
    prefix?: string;
    suffix?: string;
  };
  image?: {
    path?: string;
    width?: number;
    height?: number;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface WordTemplate {
  name: string;
  sections: TemplateSection[];
  pageSettings: {
    orientation: 'portrait' | 'landscape';
    size: 'A4' | 'Letter' | 'Legal';
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
      header?: number;
      footer?: number;
    };
  };
  defaultStyles?: {
    document?: TemplateStyle;
    paragraph?: TemplateStyle;
    heading1?: TemplateStyle;
    heading2?: TemplateStyle;
    heading3?: TemplateStyle;
  };
}

export class WordTemplateEngine {
  private template: WordTemplate;

  constructor(template?: WordTemplate) {
    this.template = template || this.getDefaultTemplate();
  }

  private getDefaultTemplate(): WordTemplate {
    return {
      name: 'תבנית ברירת מחדל',
      sections: [
        {
          id: 'title',
          type: 'title',
          content: 'שם הקובץ: {{fileName}}',
          style: {
            fontSize: 16,
            fontFamily: 'David',
            alignment: 'center',
            bold: false,
            underline: true,
            spaceAfter: 240
          }
        },
        {
          id: 'speakers',
          type: 'speakers',
          content: 'דוברים: {{speakers}}, זמן הקלטה: {{duration}}',
          style: {
            fontSize: 12,
            fontFamily: 'David',
            alignment: 'right',
            spaceAfter: 360
          }
        },
        {
          id: 'content',
          type: 'content',
          content: '{{speakerName}}:\t{{text}}',
          style: {
            fontSize: 12,
            fontFamily: 'David',
            alignment: 'justify',
            lineSpacing: 1.5,
            hangingIndent: 720,
            spaceAfter: 120
          }
        }
      ],
      pageSettings: {
        orientation: 'portrait',
        size: 'A4',
        margins: {
          top: 1134,
          bottom: 1134,
          left: 1134,
          right: 1134
        }
      }
    };
  }

  private convertStyleToDocx(style?: TemplateStyle): Partial<IParagraphOptions> {
    if (!style) return {};

    const options: Partial<IParagraphOptions> = {};

    // Alignment
    if (style.alignment) {
      const alignmentMap = {
        'left': AlignmentType.LEFT,
        'right': AlignmentType.RIGHT,
        'center': AlignmentType.CENTER,
        'justify': AlignmentType.JUSTIFIED
      };
      options.alignment = alignmentMap[style.alignment];
    }

    // Spacing
    if (style.spaceBefore) options.spacing = { ...options.spacing, before: style.spaceBefore };
    if (style.spaceAfter) options.spacing = { ...options.spacing, after: style.spaceAfter };
    if (style.lineSpacing) options.spacing = { ...options.spacing, line: style.lineSpacing * 240 };

    // Indentation
    if (style.indent || style.hangingIndent || style.firstLineIndent) {
      options.indent = {};
      if (style.indent) options.indent.left = style.indent;
      if (style.hangingIndent) options.indent.hanging = style.hangingIndent;
      if (style.firstLineIndent) options.indent.firstLine = style.firstLineIndent;
    }

    // Borders
    if (style.border) {
      options.border = {};
      const borderStyle = this.getBorderStyle(style.border.style);
      if (style.border.top) options.border.top = { style: borderStyle, size: style.border.width || 1, color: style.border.color || '000000' };
      if (style.border.bottom) options.border.bottom = { style: borderStyle, size: style.border.width || 1, color: style.border.color || '000000' };
      if (style.border.left) options.border.left = { style: borderStyle, size: style.border.width || 1, color: style.border.color || '000000' };
      if (style.border.right) options.border.right = { style: borderStyle, size: style.border.width || 1, color: style.border.color || '000000' };
    }

    // Bullets and numbering
    if (style.bullets) {
      options.bullet = { level: 0 };
    } else if (style.numbering) {
      options.numbering = {
        reference: style.numbering.reference || 'default',
        level: style.numbering.level || 0
      };
    }

    // RTL support for Hebrew
    options.bidirectional = true;

    return options;
  }

  private convertTextRunStyle(style?: TemplateStyle): Partial<IRunOptions> {
    if (!style) return {};

    const options: Partial<IRunOptions> = {};

    if (style.fontSize) options.size = style.fontSize * 2; // Convert pt to half-points
    if (style.fontFamily) options.font = style.fontFamily;
    if (style.bold) options.bold = true;
    if (style.italic) options.italics = true;
    if (style.underline) options.underline = { type: UnderlineType.SINGLE };
    if (style.color) options.color = style.color.replace('#', '');
    if (style.backgroundColor) options.shading = { 
      type: ShadingType.SOLID, 
      color: style.backgroundColor.replace('#', '') 
    };

    return options;
  }

  private getBorderStyle(style?: string): BorderStyle {
    const styleMap: Record<string, BorderStyle> = {
      'single': BorderStyle.SINGLE,
      'double': BorderStyle.DOUBLE,
      'dotted': BorderStyle.DOTTED,
      'dashed': BorderStyle.DASHED
    };
    return styleMap[style || 'single'] || BorderStyle.SINGLE;
  }

  private getPageSize(size: string): { width: number; height: number } {
    const sizes = {
      'A4': { width: 11906, height: 16838 },
      'Letter': { width: 12240, height: 15840 },
      'Legal': { width: 12240, height: 20160 }
    };
    return sizes[size] || sizes['A4'];
  }

  private replacePlaceholders(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  public async generateDocument(
    data: {
      fileName?: string;
      speakers?: string[];
      duration?: string;
      blocks?: Array<{ speaker: string; text: string; timestamp?: string }>;
    },
    template?: WordTemplate
  ): Promise<void> {
    const tpl = template || this.template;
    const sections: any[] = [];
    
    // Process template sections
    const children: Paragraph[] = [];
    
    for (const section of tpl.sections) {
      if (section.type === 'pageBreak') {
        children.push(new Paragraph({ pageBreakBefore: true }));
        continue;
      }

      if (section.type === 'table' && section.table) {
        // Create table
        const rows: TableRow[] = [];
        for (let r = 0; r < section.table.rows; r++) {
          const cells: TableCell[] = [];
          for (let c = 0; c < section.table.columns; c++) {
            cells.push(
              new TableCell({
                children: [new Paragraph({ text: 'Row ' + r + 1 + ', Col ' + c + 1 })],
                shading: section.table.shading && r === 0 ? {
                  type: ShadingType.SOLID,
                  color: 'E0E0E0'
                } : undefined
              })
            );
          }
          rows.push(new TableRow({ children: cells }));
        }
        
        // Tables need special handling - we'll skip for now
        continue;
      }

      // Process text sections
      let content = section.content || '';
      
      // Replace placeholders
      const placeholderData = {
        fileName: data.fileName || 'ללא שם',
        speakers: data.speakers?.join(', ') || 'לא צוינו',
        duration: data.duration || '00:00:00'
      };
      
      content = this.replacePlaceholders(content, placeholderData);

      // Handle content blocks (transcription)
      if (section.type === 'content' && data.blocks) {
        for (const block of data.blocks) {
          const blockContent = this.replacePlaceholders(section.content || '', {
            speakerName: block.speaker,
            text: block.text
          });

          const textRuns: TextRun[] = [];
          
          // Split by tab to handle speaker name separately
          const parts = blockContent.split('\t');
          if (parts.length > 1) {
            // Speaker name (bold)
            textRuns.push(new TextRun({
              ...this.convertTextRunStyle({ ...section.style, bold: true }),
              text: parts[0]
            }));
            // Tab and text
            textRuns.push(new TextRun({
              ...this.convertTextRunStyle(section.style),
              text: '\t' + parts.slice(1).join('\t')
            }));
          } else {
            textRuns.push(new TextRun({
              ...this.convertTextRunStyle(section.style),
              text: blockContent
            }));
          }

          children.push(new Paragraph({
            ...this.convertStyleToDocx(section.style),
            children: textRuns,
            tabStops: [{
              type: TabStopType.LEFT,
              position: 1440
            }]
          }));
        }
      } else {
        // Regular sections
        children.push(new Paragraph({
          ...this.convertStyleToDocx(section.style),
          children: [
            new TextRun({
              ...this.convertTextRunStyle(section.style),
              text: content
            })
          ]
        }));
      }
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            ...this.getPageSize(tpl.pageSettings.size),
            orientation: tpl.pageSettings.orientation === 'landscape' 
              ? PageOrientation.LANDSCAPE 
              : PageOrientation.PORTRAIT,
            margin: tpl.pageSettings.margins
          },
          bidi: true
        },
        children
      }]
    });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    saveAs(blob, (data.fileName || 'document') + '.docx');
  }

  public saveTemplate(template: WordTemplate): void {
    localStorage.setItem('wordTemplate', JSON.stringify(template));
  }

  public loadTemplate(): WordTemplate | null {
    const saved = localStorage.getItem('wordTemplate');
    return saved ? JSON.parse(saved) : null;
  }

  public async saveTemplateToDatabase(template: WordTemplate): Promise<void> {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!response.ok) throw new Error('Failed to save template');
  }

  public async loadTemplatesFromDatabase(): Promise<WordTemplate[]> {
    const response = await fetch('/api/templates');
    if (!response.ok) throw new Error('Failed to load templates');
    return response.json();
  }
}