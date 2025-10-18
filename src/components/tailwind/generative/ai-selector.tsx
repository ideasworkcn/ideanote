"use client";

import { Command, CommandInput } from "@/components/ui/command";
import { useCompletion } from "@/hooks/useCompletion";
import { ArrowUp } from "lucide-react";
import { useEditor } from "novel";
import { addAIHighlight } from "novel/extensions";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CrazySpinner from "../ui/icons/crazy-spinner";
import { Wand2 as Magic } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import AICompletionCommands from "./ai-completion-command";
import AISelectorCommands from "./ai-selector-commands";
interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState("");

  const { completion, complete, isLoading } = useCompletion({
    api: "/api/generate",
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const hasCompletion = completion.length > 0;

  return (
    <>
      <Command className="w-[500px]">
        
        {hasCompletion && (
          <div className="flex max-h-[400px]">
            <ScrollArea>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 text-sm">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    // 自定义组件样式
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-medium mb-1 text-gray-900 dark:text-gray-100">{children}</h3>,
                    p: ({ children }) => <p className="mb-2 text-gray-800 dark:text-gray-200 leading-relaxed">{children}</p>,
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400">
                          {children}
                        </code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mb-3 border dark:border-gray-700">
                        {children}
                      </pre>
                    ),
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300 mb-2">
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-800 dark:text-gray-200">{children}</em>,
                    a: ({ href, children }) => (
                      <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                    hr: () => <hr className="border-gray-300 dark:border-gray-600 my-4" />,
                    table: ({ children }) => (
                      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 mb-3">
                        {children}
                      </table>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {completion}
                </Markdown>
              </div>
            </ScrollArea>
          </div>
        )}

        {isLoading && (
          <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground text-purple-500">
            <Magic className="mr-2 h-4 w-4 shrink-0  " />
            AI is thinking
            <div className="ml-2 mt-1">
              <CrazySpinner />
            </div>
          </div>
        )}
        {!isLoading && (
          <>
            <div className="relative">
              <CommandInput
                value={inputValue}
                onValueChange={setInputValue}
                autoFocus
                placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
                onFocus={() => {
                  if (!editor) return;
                  addAIHighlight(editor);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('ai-submit-button')?.click();
                  }
                }}
              />
              <Button
                id="ai-submit-button"
                size="icon"
                className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-900"
                onClick={() => {
                  if (completion)
                    return complete(completion, {
                      body: { option: "zap", command: inputValue },
                    }).then(() => setInputValue(""));

                    if (!editor) return;
                  const slice = editor.state.selection.content();
                  const text = editor.storage.markdown.serializer.serialize(slice.content);

                  complete(text, {
                    body: { option: "zap", command: inputValue },
                  }).then(() => setInputValue(""));
                }}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
            {hasCompletion ? (
              <AICompletionCommands
                onDiscard={() => {
                  if (!editor) return;
                  editor.chain().unsetHighlight().focus().run();
                  onOpenChange(false);
                }}
                completion={completion}
              />
            ) : (
              <AISelectorCommands onSelect={(value, option) => complete(value, { body: { option } })} />
            )}
          </>
        )}
      </Command>
    </>
  );
}
