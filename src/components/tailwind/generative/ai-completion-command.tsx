import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useEditor } from "novel";
import { Check, TextQuote, TrashIcon } from "lucide-react";

const AICompletionCommands = ({
  completion,
  onDiscard,
}: {
  completion: string;
  onDiscard: () => void;
}) => {
  const { editor } = useEditor();

  return (
    <>
      <CommandGroup>
        <CommandItem
          className="gap-2 px-4"
          value="replace"
          onSelect={() => {
            if (!editor) return;
            const selection = editor.view.state.selection;
            const docSize = editor.view.state.doc.content.size;

            // 确保选择范围在文档范围内
            const safeFrom = Math.min(selection.from, docSize);
            const safeTo = Math.min(selection.to, docSize);

            editor
              .chain()
              .focus()
              .insertContentAt(
                {
                  from: safeFrom,
                  to: safeTo,
                },
                completion,
              )
              .run();
          }}
        >
          <Check className="h-4 w-4 text-muted-foreground" />
          Replace selection
        </CommandItem>
        <CommandItem
          className="gap-2 px-4"
          value="insert"
          onSelect={() => {
            if (!editor) return;
            const selection = editor.view.state.selection;
            const docSize = editor.view.state.doc.content.size;
            
            // 确保插入位置不超出文档范围
            const insertPosition = Math.min(selection.to + 1, docSize);
            
            editor
              .chain()
              .focus()
              .insertContentAt(insertPosition, completion)
              .run();
          }}
        >
          <TextQuote className="h-4 w-4 text-muted-foreground" />
          Insert below
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />

      <CommandGroup>
        <CommandItem onSelect={onDiscard} value="thrash" className="gap-2 px-4">
          <TrashIcon className="h-4 w-4 text-muted-foreground" />
          Discard
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AICompletionCommands;
