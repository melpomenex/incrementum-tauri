/**
 * Signup Prompt - Encourages users to create account after onboarding
 */

import { Cloud, CheckCircle, ArrowRight } from 'lucide-react';

interface SignupPromptProps {
  onSignup: () => void;
  onContinueDemo: () => void;
}

export function SignupPrompt({ onSignup, onContinueDemo }: SignupPromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="p-6 text-center border-b border-zinc-800">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to sync across devices?
          </h2>
          <p className="text-zinc-400 text-sm">
            Create an account to access your data from anywhere
          </p>
        </div>

        {/* Benefits */}
        <div className="p-6">
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-zinc-300">Access your documents and progress from any device</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-zinc-300">Automatic backup - never lose your learning data</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-zinc-300">Seamless sync between desktop, tablet, and phone</span>
            </li>
          </ul>

          {/* Demo mode notice */}
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-sm text-zinc-400">
              Or continue in <span className="text-white font-medium">Demo Mode</span> with local storage.
              You can sign up anytime later.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex flex-col gap-3">
          <button
            onClick={onSignup}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Create Account
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onContinueDemo}
            className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
          >
            Continue with Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}
