import React, { useState } from 'react';

interface Props {
  onSubmit: (question: string, budgetUsdc: number) => void;
  isLoading: boolean;
}

export function ResearchForm({ onSubmit, isLoading }: Props) {
  const [question, setQuestion] = useState('');
  const [budget, setBudget] = useState(0.1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onSubmit(question.trim(), budget);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Research Question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isLoading}
          placeholder="What are the latest developments in Stellar blockchain adoption?"
          rows={3}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          Budget: <span className="text-cyan-400 font-bold">${budget.toFixed(3)} USDC</span>
        </label>
        <input
          type="range"
          min={0.02}
          max={1.0}
          step={0.005}
          value={budget}
          onChange={(e) => setBudget(parseFloat(e.target.value))}
          disabled={isLoading}
          className="w-full accent-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>$0.02</span>
          <span className="text-gray-400 text-center">≈ {Math.floor(budget / 0.01)} searches</span>
          <span>$1.00</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !question.trim()}
        className="w-full py-3 px-6 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Investigating...
          </>
        ) : (
          <>
            <span>Investigate</span>
            <span className="text-cyan-300">→</span>
          </>
        )}
      </button>
    </form>
  );
}