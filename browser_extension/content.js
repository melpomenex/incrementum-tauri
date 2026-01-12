// Content script for Incrementum Browser Sync
// Provides additional functionality when injected into web pages

(function() {
  'use strict';
  
  // Only run on actual web pages, not extension pages
  if (window.location.protocol === 'chrome-extension:' || 
      window.location.protocol === 'moz-extension:') {
    return;
  }
  
  // State management
  let extractMode = false;
  let highlights = [];
  let highlightsVisible = true;
  let pageExtracts = [];
  
  // Load existing extracts from storage
  loadPageExtracts();
  
  // Add visual indicator when page is saved
  function showSaveIndicator(message) {
    // Remove any existing indicator
    const existing = document.getElementById('incrementum-save-indicator');
    if (existing) {
      existing.remove();
    }
    
    // Create indicator
    const indicator = document.createElement('div');
    indicator.id = 'incrementum-save-indicator';
    indicator.textContent = message;
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(indicator);
    
    // Animate in
    setTimeout(() => {
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 3000);
  }

  // Get page content for AI processing
  function getPageContent() {
    try {
      // Extract meaningful content from the page
      const content = [];
      
      // Get title
      if (document.title) {
        content.push(`Title: ${document.title}`);
      }
      
      // Get meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && metaDescription.content) {
        content.push(`Description: ${metaDescription.content}`);
      }
      
      // Get main content areas
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '#content',
        '#main',
        '.post-content',
        '.entry-content',
        '.article-content'
      ];
      
      let mainContent = '';
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          mainContent = element.innerText || element.textContent || '';
          break;
        }
      }
      
      // Fallback to body content if no main content found
      if (!mainContent) {
        mainContent = document.body.innerText || document.body.textContent || '';
      }
      
      // Clean up the content
      mainContent = mainContent
        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
        .replace(/\n\s*\n/g, '\n')  // Remove empty lines
        .trim();
      
      // Limit content length to avoid API limits
      if (mainContent.length > 8000) {
        mainContent = mainContent.substring(0, 8000) + '...';
      }
      
      content.push(`Content: ${mainContent}`);
      
      // Get headings for structure
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent.trim())
        .filter(text => text.length > 0)
        .slice(0, 10);  // Limit to first 10 headings
      
      if (headings.length > 0) {
        content.push(`Headings: ${headings.join(' | ')}`);
      }
      
      return content.join('\n\n');
    } catch (error) {
      console.error('Error extracting page content:', error);
      return `Title: ${document.title}\nURL: ${window.location.href}`;
    }
  }

  // Smart text analysis
  function analyzeSelectedText(text) {
    const analysis = {
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
      hasNumbers: /\d/.test(text),
      hasUrls: /https?:\/\/[^\s]+/.test(text),
      hasEmails: /\S+@\S+\.\S+/.test(text),
      language: detectLanguage(text),
      sentiment: analyzeSentiment(text),
      keywords: extractKeywords(text)
    };
    
    return analysis;
  }

  function detectLanguage(text) {
    // Simple language detection based on common words
    const patterns = {
      english: /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
      spanish: /\b(el|la|y|o|pero|en|de|con|por|para)\b/gi,
      french: /\b(le|la|et|ou|mais|dans|de|avec|par|pour)\b/gi,
      german: /\b(der|die|das|und|oder|aber|in|von|mit|für)\b/gi
    };
    
    let maxMatches = 0;
    let detectedLang = 'unknown';
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = (text.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLang = lang;
      }
    }
    
    return detectedLang;
  }

  function analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'positive'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'negative', 'wrong', 'problem'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  function extractKeywords(text) {
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Enhanced extract creation with smart features
  function createSmartExtract(text, selection, options = {}) {
    const analysis = analyzeSelectedText(text);
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const context = container.textContent || container.innerText || '';

    // Calculate priority based on text analysis and user selection
    let calculatedPriority = calculateExtractPriority(text, analysis, options.priority);

    // Create enhanced extract data
    const extractData = {
      id: generateExtractId(),
      text: text,
      context: context.substring(Math.max(0, context.indexOf(text) - 200),
                                context.indexOf(text) + text.length + 200),
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      selector: getElementSelector(range.startContainer),
      range: {
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        startContainer: getElementPath(range.startContainer),
        endContainer: getElementPath(range.endContainer)
      },
      analysis: analysis,
      tags: options.tags || [],
      category: options.category || 'general',
      priority: calculatedPriority,
      priority_source: options.priority_source || 'automatic',
      fsrs_data: {
        initial_difficulty: calculateInitialDifficulty(text, analysis),
        initial_stability: calculateInitialStability(text, analysis),
        estimated_review_time: estimateReviewTime(text, analysis)
      }
    };

    // Store extract locally
    pageExtracts.push(extractData);
    savePageExtracts();

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'saveExtractWithPriority',
      extract: extractData
    }, (response) => {
      if (response && response.success) {
        highlightText(range, extractData.id, getPriorityColor(calculatedPriority));
        showSaveIndicator(`Extract queued (Priority: ${calculatedPriority}): "${text.substring(0, 50)}..."`);
      } else {
        showSaveIndicator('Failed to save extract');
        // Remove from local storage if save failed
        pageExtracts = pageExtracts.filter(e => e.id !== extractData.id);
        savePageExtracts();
      }
    });

    // Clear selection
    selection.removeAllRanges();
  }

  // Calculate extract priority based on text analysis
  function calculateExtractPriority(text, analysis, userPriority = null) {
    // If user explicitly set priority, use it
    if (userPriority) {
      const priorityMap = {
        'low': 25,
        'normal': 50,
        'high': 75,
        'urgent': 95
      };
      return priorityMap[userPriority] || 50;
    }

    let priorityScore = 50; // Base priority

    // Adjust based on text length (medium-length content gets higher priority)
    const wordCount = analysis.wordCount;
    if (wordCount < 10) {
      priorityScore -= 10; // Very short text might be less important
    } else if (wordCount >= 10 && wordCount <= 50) {
      priorityScore += 15; // Good length for quick reviews
    } else if (wordCount > 200) {
      priorityScore -= 5; // Very long text might be overwhelming
    }

    // Adjust based on content type indicators
    if (analysis.hasNumbers) {
      priorityScore += 10; // Contains data/numbers
    }

    if (analysis.hasUrls || analysis.hasEmails) {
      priorityScore += 8; // Contains references or contact info
    }

    // Sentiment analysis
    if (analysis.sentiment === 'positive') {
      priorityScore += 5; // Positive content might be more motivating
    } else if (analysis.sentiment === 'negative') {
      priorityScore += 8; // Negative content might be important warnings/problems
    }

    // Keyword relevance
    const importantKeywords = [
      'important', 'critical', 'urgent', 'key', 'essential', 'must',
      'remember', 'note', 'warning', 'caution', 'attention',
      'summary', 'conclusion', 'result', 'finding', 'discovery',
      'definition', 'concept', 'principle', 'rule', 'formula',
      'TODO', 'FIXME', 'NOTE', 'HACK', 'XXX'
    ];

    const textLower = text.toLowerCase();
    const foundKeywords = importantKeywords.filter(keyword =>
      textLower.includes(keyword.toLowerCase())
    );

    priorityScore += foundKeywords.length * 12; // +12 for each important keyword

    // Question or definition indicators
    if (textLower.includes('?') || textLower.includes('what is') ||
        textLower.includes('define') || textLower.includes('meaning of')) {
      priorityScore += 15; // Questions and definitions are high value
    }

    // Technical content indicators
    const technicalKeywords = [
      'algorithm', 'function', 'method', 'class', 'variable', 'code',
      'formula', 'equation', 'theorem', 'proof', 'hypothesis',
      'data', 'analysis', 'research', 'study', 'experiment',
      'API', 'database', 'system', 'architecture', 'design'
    ];

    const foundTechnicalKeywords = technicalKeywords.filter(keyword =>
      textLower.includes(keyword.toLowerCase())
    );

    priorityScore += foundTechnicalKeywords.length * 8; // +8 for each technical keyword

    // Ensure priority stays within bounds (1-100)
    return Math.max(1, Math.min(100, Math.round(priorityScore)));
  }

  // Calculate initial difficulty for FSRS based on text characteristics
  function calculateInitialDifficulty(text, analysis) {
    let difficulty = 5.0; // Base difficulty (medium)

    // Adjust based on text complexity
    const wordCount = analysis.wordCount;
    const avgWordLength = text.replace(/\s/g, '').length / wordCount;

    // Longer words and complex sentences increase difficulty
    if (avgWordLength > 6) {
      difficulty += 0.5;
    }

    // Technical content increases difficulty
    const technicalIndicators = ['algorithm', 'formula', 'equation', 'theorem', 'proof'];
    const hasTechnical = technicalIndicators.some(indicator =>
      text.toLowerCase().includes(indicator)
    );

    if (hasTechnical) {
      difficulty += 1.0;
    }

    // Numbers and data can make content harder to remember
    if (analysis.hasNumbers) {
      difficulty += 0.3;
    }

    // Multiple concepts increase difficulty
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      difficulty += 0.2 * (sentences.length - 3);
    }

    return Math.max(1.0, Math.min(10.0, difficulty));
  }

  // Calculate initial stability for FSRS
  function calculateInitialStability(text, analysis) {
    let stability = 5.0; // Base stability

    // Shorter content is easier to retain initially
    if (analysis.wordCount < 20) {
      stability += 2.0;
    } else if (analysis.wordCount > 100) {
      stability -= 1.0;
    }

    // Familiar concepts (common words) are easier to retain
    const commonWords = ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'will', 'would'];
    const commonWordCount = commonWords.filter(word =>
      text.toLowerCase().includes(word)
    ).length;

    if (commonWordCount > 5) {
      stability += 0.5;
    }

    return Math.max(1.0, stability);
  }

  // Estimate review time in seconds
  function estimateReviewTime(text, analysis) {
    const baseReadingSpeed = 200; // words per minute
    const reviewMultiplier = 2; // Review takes longer than initial reading

    const readingTimeMinutes = analysis.wordCount / baseReadingSpeed;
    const reviewTimeSeconds = (readingTimeMinutes * reviewMultiplier) * 60;

    // Add time for comprehension based on complexity
    let comprehensionTime = 0;
    if (analysis.hasNumbers) {
      comprehensionTime += 10; // Extra time to process numbers/data
    }

    const technicalIndicators = ['algorithm', 'formula', 'equation', 'theorem'];
    const hasTechnical = technicalIndicators.some(indicator =>
      text.toLowerCase().includes(indicator)
    );

    if (hasTechnical) {
      comprehensionTime += 15; // Extra time for technical content
    }

    return Math.max(5, Math.round(reviewTimeSeconds + comprehensionTime));
  }

  // Get color based on priority level
  function getPriorityColor(priority) {
    if (priority >= 80) {
      return '#ff6b6b'; // Red for urgent
    } else if (priority >= 60) {
      return '#ffd93d'; // Yellow for high
    } else if (priority >= 40) {
      return '#6bcf7f'; // Green for normal
    } else {
      return '#74c0fc'; // Blue for low
    }
  }

  // Show priority selection dialog
  function showPrioritySelectionDialog(text, selection) {
    // Remove existing dialog
    const existingDialog = document.getElementById('incrementum-priority-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    // Create dialog
    const dialog = document.createElement('div');
    dialog.id = 'incrementum-priority-dialog';
    dialog.innerHTML = `
      <div class="priority-dialog-content">
        <div class="priority-dialog-header">
          <h3>📚 Create Extract with Priority</h3>
          <button class="priority-dialog-close" onclick="this.closest('#incrementum-priority-dialog').remove()">&times;</button>
        </div>
        <div class="priority-dialog-body">
          <div class="extract-preview">
            <strong>Selected Text:</strong>
            <p>"${escapeHtml(text.substring(0, 200))}${text.length > 200 ? '...' : ''}"</p>
          </div>
          <div class="priority-selection">
            <label><strong>Priority Level:</strong></label>
            <div class="priority-options">
              <label class="priority-option">
                <input type="radio" name="priority" value="urgent" checked>
                <span class="priority-urgent">🔴 Urgent (95)</span>
              </label>
              <label class="priority-option">
                <input type="radio" name="priority" value="high">
                <span class="priority-high">🟡 High (75)</span>
              </label>
              <label class="priority-option">
                <input type="radio" name="priority" value="normal">
                <span class="priority-normal">🟢 Normal (50)</span>
              </label>
              <label class="priority-option">
                <input type="radio" name="priority" value="low">
                <span class="priority-low">🔵 Low (25)</span>
              </label>
              <label class="priority-option">
                <input type="radio" name="priority" value="auto">
                <span class="priority-auto">🤖 Auto-calculate</span>
              </label>
            </div>
          </div>
          <div class="extract-tags">
            <label><strong>Tags (optional):</strong></label>
            <input type="text" id="extract-tags" placeholder="Enter tags separated by commas">
          </div>
        </div>
        <div class="priority-dialog-footer">
          <button class="priority-btn-cancel" onclick="this.closest('#incrementum-priority-dialog').remove()">Cancel</button>
          <button class="priority-btn-create" onclick="window.incrementumCreateExtractWithPriority()">Create Extract</button>
        </div>
      </div>
    `;

    // Style the dialog
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10003;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Add styles for dialog content
    const style = document.createElement('style');
    style.textContent = `
      .priority-dialog-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }

      .priority-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 10px 20px;
        border-bottom: 1px solid #eee;
      }

      .priority-dialog-header h3 {
        margin: 0;
        color: #333;
        font-size: 18px;
      }

      .priority-dialog-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .priority-dialog-close:hover {
        color: #333;
      }

      .priority-dialog-body {
        padding: 20px;
      }

      .extract-preview {
        margin-bottom: 20px;
      }

      .extract-preview p {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #007bff;
        margin: 8px 0 0 0;
        font-style: italic;
        color: #555;
      }

      .priority-selection {
        margin-bottom: 20px;
      }

      .priority-selection label {
        display: block;
        margin-bottom: 8px;
        color: #333;
      }

      .priority-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .priority-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .priority-option:hover {
        background: #f0f0f0;
      }

      .priority-option input[type="radio"] {
        margin: 0;
      }

      .extract-tags {
        margin-bottom: 20px;
      }

      .extract-tags label {
        display: block;
        margin-bottom: 8px;
        color: #333;
      }

      .extract-tags input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }

      .priority-dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px;
        border-top: 1px solid #eee;
        background: #f8f9fa;
        border-radius: 0 0 12px 12px;
      }

      .priority-btn-cancel, .priority-btn-create {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .priority-btn-cancel {
        background: #6c757d;
        color: white;
      }

      .priority-btn-cancel:hover {
        background: #5a6268;
      }

      .priority-btn-create {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
      }

      .priority-btn-create:hover {
        background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(dialog);

    // Store references for the creation function
    window.incrementumCurrentSelection = selection;
    window.incrementumCurrentText = text;
  }

  // Create extract with selected priority
  window.incrementumCreateExtractWithPriority = function() {
    const dialog = document.getElementById('incrementum-priority-dialog');
    if (!dialog) return;

    const selectedPriority = dialog.querySelector('input[name="priority"]:checked');
    const tagsInput = dialog.querySelector('#extract-tags');

    const options = {
      priority: selectedPriority ? selectedPriority.value : 'normal',
      priority_source: 'user_selected',
      tags: tagsInput ? tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag) : []
    };

    // Create the extract
    createSmartExtract(window.incrementumCurrentText, window.incrementumCurrentSelection, options);

    // Close dialog
    dialog.remove();

    // Clean up global references
    delete window.incrementumCurrentSelection;
    delete window.incrementumCurrentText;
  };

  // Page structure analysis
  function analyzePageStructure() {
    const structure = {
      headings: [],
      links: [],
      images: [],
      forms: [],
      tables: [],
      lists: [],
      codeBlocks: [],
      quotes: []
    };
    
    // Analyze headings
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      structure.headings.push({
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent.trim(),
        id: heading.id || null
      });
    });
    
    // Analyze links
    document.querySelectorAll('a[href]').forEach(link => {
      structure.links.push({
        text: link.textContent.trim(),
        href: link.href,
        external: !link.href.startsWith(window.location.origin)
      });
    });
    
    // Analyze images
    document.querySelectorAll('img').forEach(img => {
      structure.images.push({
        src: img.src,
        alt: img.alt || '',
        title: img.title || ''
      });
    });
    
    // Analyze forms
    document.querySelectorAll('form').forEach(form => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
        type: input.type || input.tagName.toLowerCase(),
        name: input.name || '',
        placeholder: input.placeholder || ''
      }));
      
      structure.forms.push({
        action: form.action || '',
        method: form.method || 'get',
        inputs: inputs
      });
    });
    
    // Analyze tables
    document.querySelectorAll('table').forEach(table => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
      const rowCount = table.querySelectorAll('tr').length;
      
      structure.tables.push({
        headers: headers,
        rowCount: rowCount
      });
    });
    
    // Analyze lists
    document.querySelectorAll('ul, ol').forEach(list => {
      const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
      
      structure.lists.push({
        type: list.tagName.toLowerCase(),
        itemCount: items.length,
        items: items.slice(0, 5) // First 5 items
      });
    });
    
    // Analyze code blocks
    document.querySelectorAll('pre, code').forEach(code => {
      structure.codeBlocks.push({
        language: code.className.match(/language-(\w+)/)?.[1] || 'unknown',
        content: code.textContent.trim().substring(0, 100)
      });
    });
    
    // Analyze quotes
    document.querySelectorAll('blockquote').forEach(quote => {
      structure.quotes.push({
        text: quote.textContent.trim(),
        cite: quote.cite || ''
      });
    });
    
    return structure;
  }

  // Reading time estimation
  function estimateReadingTime() {
    const text = document.body.innerText || document.body.textContent || '';
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 200; // Average reading speed
    const minutes = Math.ceil(words / wordsPerMinute);
    
    return {
      words: words,
      minutes: minutes,
      readingTime: minutes === 1 ? '1 minute' : `${minutes} minutes`
    };
  }

  // Extract mode functionality
  function enableExtractMode() {
    extractMode = true;
    document.body.style.cursor = 'crosshair';
    
    // Add extract mode indicator
    const indicator = document.createElement('div');
    indicator.id = 'incrementum-extract-indicator';
    indicator.innerHTML = '📝 Extract Mode Active - Select text to create extracts';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: glow 2s infinite;
    `;
    
    // Add glow animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes glow {
        0%, 100% { box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3); }
        50% { box-shadow: 0 2px 20px rgba(76, 175, 80, 0.6); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(indicator);
    
    // Add selection listener
    document.addEventListener('mouseup', handleTextSelection);
  }

  function disableExtractMode() {
    extractMode = false;
    document.body.style.cursor = '';
    
    // Remove indicator
    const indicator = document.getElementById('incrementum-extract-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    // Remove selection listener
    document.removeEventListener('mouseup', handleTextSelection);
  }

  function handleTextSelection(event) {
    if (!extractMode) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      // Show priority selection dialog instead of immediately creating extract
      showPrioritySelectionDialog(selectedText, selection);
    }
  }

  function createExtract(text, selection) {
    // Get context around the selection
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const context = container.textContent || container.innerText || '';
    
    // Create extract data
    const extractData = {
      id: generateExtractId(),
      text: text,
      context: context.substring(Math.max(0, context.indexOf(text) - 100), 
                                context.indexOf(text) + text.length + 100),
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      selector: getElementSelector(range.startContainer),
      range: {
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        startContainer: getElementPath(range.startContainer),
        endContainer: getElementPath(range.endContainer)
      }
    };
    
    // Store extract locally
    pageExtracts.push(extractData);
    savePageExtracts();
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'saveExtract',
      extract: extractData
    }, (response) => {
      if (response && response.success) {
        highlightText(range, extractData.id);
        showSaveIndicator(`Extract saved: "${text.substring(0, 50)}..."`);
      } else {
        showSaveIndicator('Failed to save extract');
        // Remove from local storage if save failed
        pageExtracts = pageExtracts.filter(e => e.id !== extractData.id);
        savePageExtracts();
      }
    });
    
    // Clear selection
    selection.removeAllRanges();
  }

  function createQuickExtract() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length === 0) {
      return { success: false, error: 'No text selected' };
    }
    
    createExtract(selectedText, selection);
    return { success: true };
  }

  function highlightText(range, extractId, color = null) {
    try {
      const span = document.createElement('span');
      span.className = 'incrementum-highlight';
      span.dataset.extractId = extractId;
      
      const highlightColor = color || '#ffd3a5';
      span.style.cssText = `
        background: linear-gradient(135deg, ${highlightColor} 0%, ${adjustColor(highlightColor, -20)} 100%);
        padding: 2px 4px;
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        cursor: pointer;
        position: relative;
      `;
      
      // Add click handler for highlight
      span.addEventListener('click', (e) => {
        e.preventDefault();
        showExtractTooltip(span, extractId);
      });
      
      range.surroundContents(span);
      highlights.push({ element: span, extractId: extractId });
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  }

  function adjustColor(color, percent) {
    // Simple color adjustment function
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  function showExtractTooltip(element, extractId) {
    const extract = pageExtracts.find(e => e.id === extractId);
    if (!extract) return;

    // Remove existing tooltip
    const existingTooltip = document.getElementById('incrementum-extract-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'incrementum-extract-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <div class="tooltip-text">${escapeHtml(extract.text)}</div>
        <div class="tooltip-meta">
          <span>Created: ${new Date(extract.timestamp).toLocaleString()}</span>
          <button class="tooltip-delete" data-extract-id="${extractId}">🗑️ Delete</button>
        </div>
      </div>
    `;
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      max-width: 300px;
      z-index: 10002;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 5) + 'px';

    document.body.appendChild(tooltip);

    // Add delete handler
    tooltip.querySelector('.tooltip-delete').addEventListener('click', () => {
      deleteExtractById(extractId);
      tooltip.remove();
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 5000);
  }

  function deleteExtractById(extractId) {
    // Remove from local storage
    pageExtracts = pageExtracts.filter(e => e.id !== extractId);
    savePageExtracts();

    // Remove highlight
    const highlight = highlights.find(h => h.extractId === extractId);
    if (highlight) {
      const element = highlight.element;
      const parent = element.parentNode;
      if (parent) {
        // Replace highlighted element with its text content
        parent.replaceChild(document.createTextNode(element.textContent), element);
        parent.normalize(); // Merge adjacent text nodes
      }
      highlights = highlights.filter(h => h.extractId !== extractId);
    }

    showSaveIndicator('Extract deleted');
  }

  function toggleHighlights() {
    highlightsVisible = !highlightsVisible;
    
    highlights.forEach(highlight => {
      highlight.element.style.display = highlightsVisible ? 'inline' : 'none';
    });
    
    return { success: true, enabled: highlightsVisible };
  }

  function getPageStats() {
    return {
      success: true,
      extractsCount: pageExtracts.length,
      highlightsCount: highlights.length,
      extracts: pageExtracts
    };
  }

  function highlightExtractById(extractId) {
    const extract = pageExtracts.find(e => e.id === extractId);
    if (!extract) {
      return { success: false, error: 'Extract not found' };
    }

    // Try to find and highlight the text
    const textNodes = getTextNodes(document.body);
    for (const node of textNodes) {
      const text = node.textContent;
      const index = text.indexOf(extract.text);
      if (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + extract.text.length);
        
        // Temporarily highlight
        const span = document.createElement('span');
        span.style.cssText = `
          background: yellow;
          animation: flash 2s ease-in-out;
        `;
        
        try {
          range.surroundContents(span);
          
          // Add flash animation
          const style = document.createElement('style');
          style.textContent = `
            @keyframes flash {
              0%, 100% { background: yellow; }
              50% { background: orange; }
            }
          `;
          document.head.appendChild(style);
          
          // Remove highlight after animation
          setTimeout(() => {
            if (span.parentNode) {
              span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
            }
            if (style.parentNode) {
              style.remove();
            }
          }, 2000);
          
          // Scroll to highlight
          span.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          return { success: true };
        } catch (error) {
          console.error('Error highlighting extract:', error);
        }
      }
    }

    return { success: false, error: 'Text not found on page' };
  }

  function clearAllExtracts() {
    // Remove all highlights
    highlights.forEach(highlight => {
      const element = highlight.element;
      const parent = element.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(element.textContent), element);
        parent.normalize();
      }
    });

    // Clear arrays
    pageExtracts = [];
    highlights = [];
    
    // Clear storage
    savePageExtracts();

    return { success: true };
  }

  function getElementSelector(element) {
    // Simple selector generation - could be enhanced
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      return `.${element.className.split(' ')[0]}`;
    }
    
    return element.tagName.toLowerCase();
  }

  function getElementPath(element) {
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      } else {
        let sibling = element;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.tagName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      element = element.parentElement;
    }
    return path.join(' > ');
  }

  function getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    return textNodes;
  }

  function generateExtractId() {
    return 'extract_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function savePageExtracts() {
    const key = `incrementum_extracts_${window.location.hostname}`;
    localStorage.setItem(key, JSON.stringify(pageExtracts));
  }

  function loadPageExtracts() {
    try {
      const key = `incrementum_extracts_${window.location.hostname}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        pageExtracts = JSON.parse(stored);
        
        // Restore highlights for existing extracts
        pageExtracts.forEach(extract => {
          restoreHighlight(extract);
        });
      }
    } catch (error) {
      console.error('Error loading page extracts:', error);
      pageExtracts = [];
    }
  }

  function restoreHighlight(extract) {
    // Try to find and restore highlight for existing extract
    const textNodes = getTextNodes(document.body);
    for (const node of textNodes) {
      const text = node.textContent;
      const index = text.indexOf(extract.text);
      if (index !== -1) {
        try {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + extract.text.length);
          highlightText(range, extract.id);
          break;
        } catch (error) {
          // Ignore errors when restoring highlights
        }
      }
    }
  }
  
  // Listen for messages from background script and popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'showSaveIndicator':
        showSaveIndicator(message.text || 'Saved to Incrementum');
        sendResponse({ success: true });
        break;
        
      case 'enableExtractMode':
        enableExtractMode();
        sendResponse({ success: true });
        break;
        
      case 'disableExtractMode':
        disableExtractMode();
        sendResponse({ success: true });
        break;
        
      case 'createQuickExtract':
        const result = createQuickExtract();
        sendResponse(result);
        break;

      case 'getSelection': {
        const selectionText = window.getSelection().toString().trim();
        if (selectionText.length > 0) {
          sendResponse({ success: true, text: selectionText });
        } else {
          sendResponse({ success: false, text: '' });
        }
        break;
      }
        
      case 'toggleHighlights':
        const toggleResult = toggleHighlights();
        sendResponse(toggleResult);
        break;
        
      case 'toggleExtractMode':
        if (extractMode) {
          disableExtractMode();
          sendResponse({ success: true, enabled: false });
        } else {
          enableExtractMode();
          sendResponse({ success: true, enabled: true });
        }
        break;

      case 'getExtractModeStatus':
        sendResponse({ success: true, extractMode: extractMode });
        break;

      case 'getPageStats':
        const stats = getPageStats();
        sendResponse(stats);
        break;

      case 'highlightExtract':
        const highlightResult = highlightExtractById(message.extract.id);
        sendResponse(highlightResult);
        break;

      case 'deleteExtract':
        deleteExtractById(message.extract.id);
        sendResponse({ success: true });
        break;

      case 'clearAllExtracts':
        const clearResult = clearAllExtracts();
        sendResponse(clearResult);
        break;

      case 'getPageContent':
        const content = getPageContent();
        sendResponse({ success: true, content: content });
        break;

      case 'analyzePageStructure':
        const structure = analyzePageStructure();
        sendResponse({ success: true, structure: structure });
        break;

      case 'getReadingTime':
        const readingTime = estimateReadingTime();
        sendResponse({ success: true, readingTime: readingTime });
        break;

      case 'createSmartExtract':
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText.length === 0) {
          sendResponse({ success: false, error: 'No text selected' });
        } else {
          createSmartExtract(selectedText, selection, message.options || {});
          sendResponse({ success: true });
        }
        break;

      case 'createPriorityExtract':
        const prioritySelection = window.getSelection();
        const priorityText = prioritySelection.toString().trim();

        if (priorityText.length === 0) {
          sendResponse({ success: false, error: 'No text selected' });
        } else {
          showPrioritySelectionDialog(priorityText, prioritySelection);
          sendResponse({ success: true });
        }
        break;

      case 'analyzeSelection':
        const currentSelection = window.getSelection();
        const currentText = currentSelection.toString().trim();
        
        if (currentText.length === 0) {
          sendResponse({ success: false, error: 'No text selected' });
        } else {
          const analysis = analyzeSelectedText(currentText);
          sendResponse({ success: true, analysis: analysis });
        }
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return true;
  });
  
  // Add keyboard shortcut listeners
  document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+S (or Cmd+Shift+S on Mac) - Save current page
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault();

      chrome.runtime.sendMessage({ action: 'saveCurrentTab' }, (response) => {
        if (response && response.success) {
          showSaveIndicator('Page saved to Incrementum!');
        } else {
          showSaveIndicator('Failed to save page');
        }
      });
    }

    // Ctrl+Shift+E (or Cmd+Shift+E on Mac) - Toggle extract mode
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
      event.preventDefault();

      if (extractMode) {
        disableExtractMode();
        showSaveIndicator('Extract mode disabled');
      } else {
        enableExtractMode();
        showSaveIndicator('Extract mode enabled');
      }
    }

    // Ctrl+Shift+X (or Cmd+Shift+X on Mac) - Quick extract with priority
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'X') {
      event.preventDefault();

      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText.length === 0) {
        showSaveIndicator('No text selected for extract');
      } else {
        // Show priority selection dialog for quick extract
        showPrioritySelectionDialog(selectedText, selection);
      }
    }

    // Ctrl+Shift+H (or Cmd+Shift+H on Mac) - Toggle highlights
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
      event.preventDefault();

      const result = toggleHighlights();
      showSaveIndicator(result.enabled ? 'Highlights shown' : 'Highlights hidden');
    }

    // Ctrl+Shift+P (or Cmd+Shift+P on Mac) - Priority extract (alternative shortcut)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
      event.preventDefault();

      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText.length === 0) {
        showSaveIndicator('No text selected for priority extract');
      } else {
        // Show priority selection dialog
        showPrioritySelectionDialog(selectedText, selection);
      }
    }
  });
  
  // Add context menu enhancement (visual feedback)
  document.addEventListener('contextmenu', (event) => {
    // Store the context menu position for potential use
    window.incrementumContextPos = {
      x: event.clientX,
      y: event.clientY,
      target: event.target
    };
  });

  // YouTube-specific functionality
  function initYouTubeIntegration() {
    // Check if we're on YouTube
    if (!window.location.hostname.includes('youtube.com')) {
      return;
    }

    // Create the save button for YouTube videos
    function createYouTubeSaveButton() {
      // Remove existing button if it exists
      const existingButton = document.getElementById('incrementum-youtube-save-btn');
      if (existingButton) {
        existingButton.remove();
      }

      // Wait for the video title and actions to load
      const titleElement = document.querySelector('#title h1 yt-formatted-string, #container h1 yt-formatted-string');
      const actionsContainer = document.querySelector('#actions, #top-level-buttons, #menu-container');
      
      if (!titleElement || !actionsContainer) {
        // Retry after a short delay
        setTimeout(createYouTubeSaveButton, 1000);
        return;
      }

      // Create the save button
      const saveButton = document.createElement('button');
      saveButton.id = 'incrementum-youtube-save-btn';
      saveButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
        </svg>
        <span>Save to Incrementum</span>
      `;
      
      saveButton.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'YouTube Sans', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 1000;
        margin-left: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;

      // Add hover effects
      saveButton.addEventListener('mouseenter', () => {
        saveButton.style.transform = 'translateY(-1px)';
        saveButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      });

      saveButton.addEventListener('mouseleave', () => {
        saveButton.style.transform = 'translateY(0)';
        saveButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      });

      // Add click handler
      saveButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Temporarily disable button and show loading state
        saveButton.disabled = true;
        const originalContent = saveButton.innerHTML;
        saveButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
          </svg>
          <span>Saving...</span>
        `;
        
        // Get video information
        const videoData = getYouTubeVideoData();
        let savedSuccessfully = false;
        
        // Define fallback function
        const performFallbackSave = async () => {
          console.log('Trying fallback methods...');
          let fallbackSuccessful = false;
          let INCREMENTUM_BASE_URL = 'http://127.0.0.1:8766'; // fallback to user's server

          // Method 1: Try storage API first (might fail if context invalid)
          try {
            if (chrome.storage && chrome.storage.sync) {
              const settings = await new Promise((resolve, reject) => {
                try {
                  chrome.storage.sync.get(['serverUrl', 'browserSyncPort'], (result) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(chrome.runtime.lastError.message));
                    } else {
                      resolve(result);
                    }
                  });
                } catch (e) { reject(e); }
              });

              // Build URL
              let serverUrl = settings.serverUrl || '127.0.0.1';
              let port = settings.browserSyncPort || 8766;
              serverUrl = serverUrl.replace(/:\d+$/, '');
              if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
                serverUrl = `http://${serverUrl}`;
              }
              const url = new URL(serverUrl);
              url.port = port.toString();
              INCREMENTUM_BASE_URL = url.toString();
              console.log('YouTube fallback using storage settings:', INCREMENTUM_BASE_URL);

              try {
                localStorage.setItem('incrementum_settings', JSON.stringify(settings));
              } catch (cacheError) {
                console.log('Failed to cache settings:', cacheError.message);
              }
            }
          } catch (settingsError) {
            console.log('Storage API failed, trying localStorage:', settingsError.message);
            // Method 2: Try to read settings from localStorage
            try {
              const storedSettings = localStorage.getItem('incrementum_settings');
              if (storedSettings) {
                const settings = JSON.parse(storedSettings);
                let serverUrl = settings.serverUrl || '127.0.0.1';
                let port = settings.browserSyncPort || 8766;
                serverUrl = serverUrl.replace(/:\d+$/, '');
                if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
                  serverUrl = `http://${serverUrl}`;
                }
                const url = new URL(serverUrl);
                url.port = port.toString();
                INCREMENTUM_BASE_URL = url.toString();
                console.log('YouTube fallback using localStorage settings:', INCREMENTUM_BASE_URL);
              }
            } catch (localError) {
              console.log('LocalStorage also failed:', localError.message);
            }
          }

          // Method 3: Try direct fetch
          try {
            console.log('YouTube fallback attempting fetch to:', INCREMENTUM_BASE_URL);
            const currentUrl = window.location.href;
            const currentTitle = videoData.title || document.title;
            
            const response = await fetch(`${INCREMENTUM_BASE_URL}/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: currentUrl,
                title: currentTitle,
                content: '',
                type: 'page',
                source: 'browser_extension_youtube_fallback',
                timestamp: new Date().toISOString()
              })
            });

            if (response.ok) {
              fallbackSuccessful = true;
              console.log('YouTube fallback fetch successful');
            } else {
              console.log('YouTube fallback fetch failed with status:', response.status);
            }
          } catch (fetchError) {
            console.log('YouTube fallback fetch failed:', fetchError.message);
          }

          if (fallbackSuccessful) {
             return true;
          } else {
            // Method 4: Clipboard fallback
            console.log('Server connection failed, using clipboard fallback');
            try {
              const url = window.location.href;
              const title = videoData.title || document.title;
              const textToCopy = `Incrementum Save:\nURL: ${url}\nTitle: ${title}\nType: YouTube Video\n\nServer connection failed - please check your Incrementum server settings`;
              
              await navigator.clipboard.writeText(textToCopy);
              
              // Indicate copy success differently
              saveButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8v2h11V5zm0 4H8v2h11V9zm0 4H8v2h11v-2zm0 4H8v2h11v-2z"/>
                </svg>
                <span>Copied!</span>
              `;
              saveButton.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
              showSaveIndicator('❌ Server connection failed! Data copied to clipboard');
              
              setTimeout(() => {
                saveButton.innerHTML = originalContent;
                saveButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                saveButton.disabled = false;
              }, 4000);
              
              return true; // Considered handled
            } catch (clipboardError) {
              console.log('Clipboard fallback failed:', clipboardError.message);
              return false;
            }
          }
        };

        try {
          // Check if extension context is valid before sending message
          if (chrome.runtime && chrome.runtime.id) {
            console.log('[CONTENT DEBUG] Sending saveCurrentTab message to background');
            // Send to background script for saving
            const response = await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('Extension context timeout'));
              }, 5000);

              try {
                  chrome.runtime.sendMessage({
                    action: 'saveCurrentTab'
                  }, (response) => {
                    clearTimeout(timeoutId);
                    if (chrome.runtime.lastError) {
                      reject(new Error(chrome.runtime.lastError.message));
                    } else {
                      resolve(response);
                    }
                  });
              } catch (e) {
                  clearTimeout(timeoutId);
                  reject(e);
              }
            });

            if (response && response.success) {
               savedSuccessfully = true;
            } else {
               throw new Error(response?.error || 'Failed to save via extension');
            }
          } else {
             throw new Error("Extension context invalid");
          }
        } catch (error) {
          console.error('Primary save failed:', error);
          // Try fallback
          try {
             const result = await performFallbackSave();
             if (result) savedSuccessfully = true;
             else throw new Error("Fallback failed");
          } catch (fallbackError) {
             console.error("All save methods failed", fallbackError);
             // Show error state
              saveButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                <span>Error</span>
              `;
              saveButton.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';

              let msg = 'Failed to save YouTube video';
              if (error.message.includes('context')) msg = 'Extension context lost - reload extension';
              showSaveIndicator(msg);
              
              setTimeout(() => {
                saveButton.innerHTML = originalContent;
                saveButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                saveButton.disabled = false;
              }, 2000);
          }
        }

        if (savedSuccessfully && saveButton.textContent !== 'Copied!') {
            // Show success state (if not already handled by clipboard fallback)
            saveButton.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>Saved!</span>
            `;
            saveButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
            showSaveIndicator(`YouTube video saved: ${videoData.title}`);
            
            setTimeout(() => {
              saveButton.innerHTML = originalContent;
              saveButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
              saveButton.disabled = false;
            }, 2000);
        }
      });
      
      // Insert the button in the actions container
      // Try different insertion points depending on YouTube layout
      const likeButton = actionsContainer.querySelector('button[aria-label*="like"], button[title*="like"], #like-button');
      const shareButton = actionsContainer.querySelector('button[aria-label*="Share"], button[title*="Share"], #share-button');
      
      if (likeButton && likeButton.parentNode) {
        // Insert after like button
        likeButton.parentNode.insertBefore(saveButton, likeButton.nextSibling);
      } else if (shareButton && shareButton.parentNode) {
        // Insert after share button
        shareButton.parentNode.insertBefore(saveButton, shareButton.nextSibling);
      } else {
        // Fallback: append to actions container
        actionsContainer.appendChild(saveButton);
      }
    }

    // Function to extract YouTube video data
    function getYouTubeVideoData() {
      const titleElement = document.querySelector('#title h1 yt-formatted-string, #container h1 yt-formatted-string');
      const channelElement = document.querySelector('#channel-name a, #owner-name a, .ytd-channel-name a');
      const descriptionElement = document.querySelector('#description, #meta-contents, .ytd-video-secondary-info-renderer');
      
      return {
        title: titleElement ? titleElement.textContent.trim() : document.title,
        channel: channelElement ? channelElement.textContent.trim() : '',
        url: window.location.href,
        description: descriptionElement ? descriptionElement.textContent.trim().substring(0, 500) : '',
        timestamp: new Date().toISOString()
      };
    }

    // Initialize the button when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createYouTubeSaveButton);
    } else {
      createYouTubeSaveButton();
    }

    // Re-create button when navigating between YouTube videos (SPA navigation)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        // Delay to allow page content to load
        setTimeout(createYouTubeSaveButton, 1500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also listen for YouTube's navigation events
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(createYouTubeSaveButton, 1000);
    });

    // Add CSS for spinning animation
    if (!document.getElementById('incrementum-youtube-styles')) {
      const style = document.createElement('style');
      style.id = 'incrementum-youtube-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Initialize YouTube integration
  initYouTubeIntegration();

  console.log('Incrementum content script loaded');
})(); 
