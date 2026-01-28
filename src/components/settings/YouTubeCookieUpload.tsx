/**
 * YouTube Cookie Upload Component
 * Allows users to upload their YouTube cookies for authenticated transcript fetching
 */

import { useState, useEffect, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, Info, Trash2, Shield } from 'lucide-react';
import { 
  parseCookies, 
  validateCookies, 
  saveCookies, 
  clearCookies, 
  getCookieMetadata,
  YouTubeCookie,
} from '../../lib/youtubeCookies';
import { useToast } from '../common/Toast';

interface YouTubeCookieUploadProps {
  onCookiesUpdated?: () => void;
}

export function YouTubeCookieUpload({ onCookiesUpdated }: YouTubeCookieUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsedCookies, setParsedCookies] = useState<YouTubeCookie[] | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const [metadata, setMetadata] = useState<{ hasCookies: boolean; count: number; uploadedAt: number | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const loadMetadata = useCallback(async () => {
    const meta = await getCookieMetadata();
    setMetadata(meta);
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const handleInputChange = (value: string) => {
    setInput(value);
    
    if (!value.trim()) {
      setParsedCookies(null);
      setValidation(null);
      return;
    }

    try {
      const cookies = parseCookies(value);
      setParsedCookies(cookies);
      setValidation(validateCookies(cookies));
    } catch {
      setParsedCookies([]);
      setValidation({ valid: false, message: 'Could not parse cookies. Please check the format.' });
    }
  };

  const handleSave = async () => {
    if (!parsedCookies || parsedCookies.length === 0) return;

    setIsLoading(true);
    try {
      await saveCookies(parsedCookies);
      toast.success('Cookies saved', 'Your YouTube cookies have been saved locally.');
      setInput('');
      setParsedCookies(null);
      setValidation(null);
      setIsOpen(false);
      await loadMetadata();
      onCookiesUpdated?.();
    } catch (error) {
      toast.error('Failed to save', 'Could not save cookies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    try {
      await clearCookies();
      toast.success('Cookies cleared', 'Your YouTube cookies have been removed.');
      await loadMetadata();
      onCookiesUpdated?.();
    } catch (error) {
      toast.error('Failed to clear', 'Could not clear cookies.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex items-center gap-2">
        {metadata?.hasCookies ? (
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">
              {metadata.count} cookies stored
              {metadata.uploadedAt && (
                <span className="text-xs ml-1">
                  (uploaded {new Date(metadata.uploadedAt).toLocaleDateString()})
                </span>
              )}
            </span>
            <button
              onClick={() => setIsOpen(true)}
              className="text-xs text-primary hover:underline ml-2"
            >
              Update
            </button>
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="text-xs text-destructive hover:text-destructive/80 ml-1 p-1 hover:bg-destructive/10 rounded"
              title="Clear cookies"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-md transition-colors"
          >
            <Shield className="w-4 h-4" />
            Add YouTube Cookies
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            YouTube Cookie Authentication
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your YouTube cookies to improve transcript fetching reliability.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-amber-800">
            <p>
              <strong>Why do I need this?</strong> YouTube sometimes blocks automated transcript requests. 
              Using your own cookies makes requests appear legitimate.
            </p>
            <p>
              <strong>Your cookies are:</strong>
            </p>
            <ul className="list-disc list-inside ml-1 space-y-0.5">
              <li>Stored only in your browser (IndexedDB)</li>
              <li>Never sent to our servers except for transcript fetching</li>
              <li>Never logged or shared</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Paste your cookies here:
        </label>
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={`Paste cookies in any format:

JSON (from EditThisCookie):
[{"name": "LOGIN_INFO", "value": "...", ...}]

Or Netscape format (from Get cookies.txt):
.youtube.com\tTRUE\t/\tTRUE\t...\tLOGIN_INFO\t...`}
          className="w-full h-32 px-3 py-2 text-xs font-mono bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {validation && (
        <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
          validation.valid 
            ? 'bg-green-500/10 text-green-700 border border-green-500/20' 
            : 'bg-red-500/10 text-red-700 border border-red-500/20'
        }`}>
          {validation.valid ? (
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{validation.message}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>How to get your cookies:</strong></p>
        <ol className="list-decimal list-inside space-y-1 ml-1">
          <li>Install the <a href="https://chromewebstore.google.com/detail/get-cookiestxt/bgaddhkoddajcdgocldbbfleckgcbcid" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get cookies.txt</a> extension</li>
          <li>Go to <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">youtube.com</a> and make sure you&apos;re logged in</li>
          <li>Click the extension icon and click &quot;Export&quot;</li>
          <li>Paste the contents above</li>
        </ol>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!parsedCookies || parsedCookies.length === 0 || isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            'Saving...'
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Save Cookies
            </>
          )}
        </button>
      </div>
    </div>
  );
}
