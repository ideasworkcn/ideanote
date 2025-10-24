import { EditorBubble, useEditor } from "novel";
import { removeAIHighlight } from "novel/extensions";
import {} from "novel/plugins";
import { Fragment, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2 as Magic } from "lucide-react";
import { AISelector } from "./ai-selector";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 自定义定位函数：检查选中内容是否在可视区域内
const getCustomPosition = () => {
  return {
    name: 'customPosition',
    options: {
      boundary: 'viewport',
      // 当内容超出可视区域时，在可视区域中心显示
      getReferenceClientRect: () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          // 如果没有选区，返回可视区域中心
          const viewportCenter = {
            left: window.innerWidth / 2,
            top: window.innerHeight / 2,
            right: window.innerWidth / 2,
            bottom: window.innerHeight / 2,
            width: 0,
            height: 0,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          };
          return viewportCenter;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 检查选区是否在可视区域内
        const isInViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        );

        if (isInViewport) {
          // 如果在可视区域内，使用默认位置
          return rect;
        } else {
          // 如果超出可视区域，在可视区域中心显示
          const viewportCenter = {
            left: window.innerWidth / 2 - 100, // 稍微偏左，给工具栏留出空间
            top: window.innerHeight / 2 - 50,
            right: window.innerWidth / 2 + 100,
            bottom: window.innerHeight / 2 + 50,
            width: 200,
            height: 100,
            x: window.innerWidth / 2 - 100,
            y: window.innerHeight / 2 - 50,
          };
          return viewportCenter;
        }
      },
    },
  };
};

const GenerativeMenuSwitch = ({ children, open, onOpenChange }: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();

  useEffect(() => {
    if (!editor) return;  // Add null check
    if (!open) removeAIHighlight(editor);
  }, [open]);
  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? "bottom-start" : "top",
        popperOptions: {
          modifiers: [getCustomPosition()],
        },
        onHidden: () => {
          onOpenChange(false);
          if (!editor) return; 
          editor.chain().unsetHighlight().run();
        },
      }}
      className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-white shadow-xl"
    >
      {open && <AISelector open={open} onOpenChange={onOpenChange} />}
      {!open && (
        <Fragment>
          <Button
            className="gap-1 rounded-none text-purple-500"
            variant="ghost"
            onClick={() => onOpenChange(true)}
            size="sm"
          >
            <Magic className="h-5 w-5" />
            Ask AI
          </Button>
          {children}
        </Fragment>
      )}
    </EditorBubble>
  );
};

export default GenerativeMenuSwitch;
