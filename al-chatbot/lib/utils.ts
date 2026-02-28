import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeAndFormatText(inputText: string) {
  // Replace newline characters and hyphens with spaces
  let formattedText = inputText.replace(/[\n-]/g, " ");

  // Remove consecutive spaces
  formattedText = formattedText.replace(/\s+/g, " ");

  return formattedText;
}

// Clean up the response - remove tokens-ended and any JSON artifacts
export function cleanUpResponse(response: string){
  return response
      .replace(/tokens-ended\[.*?\]$/s, '')  // Remove tokens-ended[...]
      .replace(/tokens-ended.*$/s, '')       // Remove anything after tokens-ended
      .trim();
}

export function scrollToBottom(containerRef: React.RefObject<HTMLElement>) {
  if (containerRef.current) {
    const lastMessage = containerRef.current.lastElementChild;
    if (lastMessage) {
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: "smooth",
        block: "end",
      };
      lastMessage.scrollIntoView(scrollOptions);
    }
  }
}

// Reference:
// github.com/hwchase17/langchainjs/blob/357d6fccfc78f1332b54d2302d92e12f0861c12c/examples/src/guides/expression_language/cookbook_conversational_retrieval.ts#L61
export const formatChatHistory = (chatHistory: [string, string][]) => {
  const formattedDialogueTurns = chatHistory.map(
      (dialogueTurn) => `Human: ${dialogueTurn[0]}\nAssistant: ${dialogueTurn[1]}`
  );

  return formattedDialogueTurns.join("\n");
};


export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

