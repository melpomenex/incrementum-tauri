/**
 * Audio Transcription Settings
 * Configure automatic audio transcription for imported audio/video files
 */

import { Mic, Languages, Clock, Users, BarChart3 } from "lucide-react";

interface AudioTranscriptionSettingsProps {
  settings: {
    autoTranscription: boolean;
    language: string;
    timestampGeneration: boolean;
    speakerDiarization: boolean;
    confidenceScores: boolean;
    confidenceThreshold: number;
  };
  onUpdateSettings: (updates: Partial<AudioTranscriptionSettingsProps["settings"]>) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

export function AudioTranscriptionSettings({
  settings,
  onUpdateSettings,
}: AudioTranscriptionSettingsProps) {
  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Audio Transcription</h3>
          <p className="text-sm text-muted-foreground">
            Configure automatic speech-to-text transcription
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Auto-Transcription Toggle */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Auto-Transcription</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Automatically transcribe audio/video files when imported
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoTranscription: !settings.autoTranscription })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoTranscription ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.autoTranscription ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Languages className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Transcription Language</div>
              <div className="text-xs text-muted-foreground">
                Primary language for speech recognition
              </div>
            </div>
          </div>
          <select
            value={settings.language}
            onChange={(e) => onUpdateSettings({ language: e.target.value })}
            disabled={!settings.autoTranscription}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timestamp Generation */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Timestamp Generation</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Include timestamps in the transcription text
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ timestampGeneration: !settings.timestampGeneration })}
              disabled={!settings.autoTranscription}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.timestampGeneration ? "bg-primary" : "bg-muted"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.timestampGeneration ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Speaker Diarization */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Speaker Diarization</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Identify and label different speakers in the audio
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ speakerDiarization: !settings.speakerDiarization })}
              disabled={!settings.autoTranscription}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.speakerDiarization ? "bg-primary" : "bg-muted"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.speakerDiarization ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Confidence Scores */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Confidence Scores</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Show confidence scores for each transcribed segment
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ confidenceScores: !settings.confidenceScores })}
              disabled={!settings.autoTranscription}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.confidenceScores ? "bg-primary" : "bg-muted"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.confidenceScores ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {settings.confidenceScores && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground">Confidence Threshold</div>
                <div className="text-sm font-medium text-foreground">
                  {Math.round(settings.confidenceThreshold * 100)}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => onUpdateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
                disabled={!settings.autoTranscription}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low (0%)</span>
                <span>High (100%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary">
            <strong>Note:</strong> Audio transcription requires a compatible speech recognition service.
            This feature works best with clear audio recordings and may require additional setup.
          </p>
        </div>
      </div>
    </div>
  );
}
