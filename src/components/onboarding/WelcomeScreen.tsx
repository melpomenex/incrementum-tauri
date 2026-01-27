/**
 * Welcome Screen - First screen of onboarding flow
 */

import { BookOpen, Layers, Brain } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-8 text-center border-b border-zinc-800">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Incrementum
          </h1>
          <p className="text-zinc-400">
            Your incremental reading and spaced repetition companion
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Import Documents</h3>
              <p className="text-sm text-zinc-400">
                Add PDFs, EPUBs, YouTube videos, and more
              </p>
            </div>

            <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Create Extracts</h3>
              <p className="text-sm text-zinc-400">
                Highlight key passages and create notes
              </p>
            </div>

            <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Learn Efficiently</h3>
              <p className="text-sm text-zinc-400">
                Spaced repetition for long-term retention
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-zinc-800/30 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">How it works</h2>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  1
                </span>
                <p className="text-zinc-300">Import your documents (PDFs, EPUBs, videos, articles)</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  2
                </span>
                <p className="text-zinc-300">Create extracts and learning items as you read</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  3
                </span>
                <p className="text-zinc-300">Review with spaced repetition to remember what you learn</p>
              </li>
            </ol>
          </div>

          {/* Demo mode notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8">
            <p className="text-blue-400 text-sm">
              <strong>Demo Mode:</strong> You can start using the app right away without creating an account.
              Your data will be stored locally in your browser. Sign up anytime to sync across devices.
            </p>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-zinc-400 text-sm flex items-center gap-2">
              <span className="px-2 py-1 bg-zinc-700 rounded text-zinc-300 text-xs">Ctrl/⌘ + K</span>
              <span>Open the command palette anytime to navigate quickly</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-between items-center">
          <button
            onClick={onComplete}
            className="text-sm text-zinc-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded px-2 py-1"
            aria-label="Skip onboarding and start using the app"
          >
            Skip tour
          </button>
          <button
            onClick={onComplete}
            className="px-6 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            aria-label="Get started with Incrementum"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
