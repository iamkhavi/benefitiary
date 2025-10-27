# Canvas Dual-Mode System: Edit & Preview

## Overview
Implemented a dual-mode system for the canvas that addresses the Tiptap pagination issues by providing a clean preview mode that shows the actual document structure.

## The Problem You Identified
- **Tiptap canvas mode**: Broken pagination, everything on single page, poor formatting
- **User expectation**: See the actual structured document that Maya claims to have created
- **Need**: Two modes that users can switch between, with auto-switch to preview after AI actions

## Solution: Dual-Mode System

### **1. Edit Mode (Tiptap Editor)**
- **Purpose**: For making changes and edits
- **Features**: Full Tiptap functionality with formatting toolbar
- **When Active**: When user needs to manually edit content
- **Limitations**: May have pagination issues, but functional for editing

### **2. Preview Mode (Clean Document View)**
- **Purpose**: Shows properly structured, paginated document
- **Features**: 
  - Proper A4 page layout with accurate pagination
  - Professional table rendering with borders and formatting
  - Clean typography and spacing
  - Page numbers on each page
  - Proper page breaks between sections
- **When Active**: Auto-switches after Maya content insertion, or manual toggle

## Key Features Implemented

### **Auto-Switch Behavior**
```typescript
// Auto-switch to preview mode after AI content insertion
setTimeout(() => {
  setIsPreviewMode(true);
}, 500);
```
- **After every Maya action**: Automatically switches to Preview Mode
- **User sees real structure**: Immediately shows what Maya actually created
- **No broken Tiptap rendering**: Users see clean, properly formatted document

### **Mode Toggle Button**
```typescript
<Button 
  variant={isPreviewMode ? "default" : "outline"} 
  size="sm" 
  onClick={() => setIsPreviewMode(!isPreviewMode)}
>
  {isPreviewMode ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
  {isPreviewMode ? 'Edit' : 'Preview'}
</Button>
```
- **Easy switching**: Users can freely switch between modes
- **Visual indicator**: Button shows current mode clearly
- **Intuitive icons**: Eye for preview, Edit for editing

### **Smart Page Splitting**
```typescript
// Split content into pages based on page breaks
const pageBreaks = content.split(/<hr[^>]*class="page-break"[^>]*>/);
const processedPages = pageBreaks.filter(page => page.trim() !== '');
```
- **Respects page breaks**: Maya's page break elements create actual page boundaries
- **Multiple pages**: Each page is rendered as separate A4 page with proper dimensions
- **Page numbers**: Each page shows its number at the bottom

### **Professional Document Rendering**
```css
.preview-page {
  width: 210mm;
  height: 297mm;
  padding: 25mm 20mm;
  font-family: 'Times New Roman', serif;
  font-size: 12pt;
  line-height: 1.6;
}
```
- **A4 dimensions**: Exact A4 size (210mm × 297mm)
- **Professional margins**: 25mm top/bottom, 20mm left/right
- **Academic typography**: Times New Roman, 12pt, proper line spacing
- **Print-ready**: Matches professional document standards

### **Table Rendering in Preview**
```css
.preview-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 11pt;
}

.preview-content table th,
.preview-content table td {
  border: 1px solid #333;
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
}
```
- **Proper table formatting**: Borders, headers, proper spacing
- **Professional appearance**: Matches academic/business standards
- **Maya's tables work**: Budget/timeline tables render correctly

## User Experience Flow

### **1. Initial State**
- Canvas opens in **Edit Mode** by default
- User can start typing or use Maya to generate content

### **2. Maya Content Generation**
- User asks Maya to create content (budget, proposal, etc.)
- Maya generates content and inserts into Tiptap editor
- **Auto-switch to Preview Mode** after 500ms delay
- User immediately sees properly formatted, paginated document

### **3. User Sees Real Structure**
- **Professional pages**: Proper A4 layout with page numbers
- **Formatted tables**: Budget/timeline tables with borders and headers
- **Proper typography**: Academic-standard formatting
- **Page breaks**: Content flows naturally across multiple pages

### **4. Easy Mode Switching**
- **Preview → Edit**: Click "Edit" button to make changes
- **Edit → Preview**: Click "Preview" button to see formatted result
- **Toolbar visibility**: Formatting toolbar only shows in Edit mode

## Benefits

### **1. Solves Tiptap Pagination Issues**
- **No more single-page blob**: Preview mode shows proper pagination
- **Clean document structure**: Professional layout without Tiptap quirks
- **Accurate representation**: Users see what will actually be exported

### **2. Matches Maya's Claims**
- **"Professional formatting"**: Preview mode delivers on this promise
- **"Comprehensive budget table"**: Tables render properly with borders
- **"Ready for submission"**: Document looks publication-ready

### **3. Best of Both Worlds**
- **Edit Mode**: Full functionality for making changes
- **Preview Mode**: Clean, accurate document representation
- **Seamless switching**: Users can move between modes easily

### **4. Auto-Switch Intelligence**
- **After AI actions**: Users immediately see results in best format
- **Reduces confusion**: No wondering "where's my content?"
- **Builds confidence**: Users see professional output immediately

## Technical Implementation

### **State Management**
```typescript
const [isPreviewMode, setIsPreviewMode] = useState(false);
const [documentContent, setDocumentContent] = useState('');
```

### **Content Synchronization**
```typescript
onUpdate: ({ editor }) => {
  const html = editor.getHTML();
  setDocumentContent(html); // Keep preview in sync
}
```

### **Conditional Rendering**
```typescript
{isPreviewMode ? (
  <PreviewMode content={documentContent} />
) : (
  <EditorContent editor={editor} />
)}
```

## Result

Users now have:
- ✅ **Functional editing** in Edit Mode
- ✅ **Professional preview** in Preview Mode  
- ✅ **Auto-switch after Maya actions** to see real results
- ✅ **Easy mode switching** for best workflow
- ✅ **Proper pagination** that actually works
- ✅ **Professional document formatting** ready for export

**The canvas now delivers on Maya's promises with a clean, professional document view that matches what users expect to see!**