import { Sparkles, Book } from "lucide-react";
import React from "react";

export const SuggestedQuestions = ({ suggestions, onSelect, config }) => {
    return (
        <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className={`w-5 h-5 ${config.iconColor}`} />
                <h3 className="text-sm font-medium text-gray-700">Try asking about:</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((question, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(question)}
                        className={`text-left p-4 bg-white rounded-xl border ${config.borderColor} ${config.hoverBorder} hover:shadow-md transition-all duration-200 text-sm text-gray-700 ${config.textColor}`}
                    >
                        <Book className={`w-4 h-4 inline mr-2 ${config.iconColor}`} />
                        {question}
                    </button>
                ))}
            </div>
        </div>
    );
}
