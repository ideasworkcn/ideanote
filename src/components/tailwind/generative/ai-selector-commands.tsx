import { ArrowDownWideNarrow, CheckCheck, RefreshCcwDot, WrapText, AlignJustify } from "lucide-react";
import { useEditor } from "novel";
import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";

const options = [
  {
    value: "improve",
    label: "文稿润色",
    icon: RefreshCcwDot,
  },

  {
    value: "fix",
    label: "语法检查",
    icon: CheckCheck,
  },
  {
    value: "shorter",
    label: "文稿缩写",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "longer",
    label: "文稿扩写",
    icon: WrapText,
  },
  {
    value: "format",
    label: "内容排版",
    icon: AlignJustify,
  },
];

interface AISelectorCommandsProps {
  onSelect: (value: string, option: string) => void;
}

const AISelectorCommands = ({ onSelect }: AISelectorCommandsProps) => {
  const { editor } = useEditor();

  return (
    <>
      <CommandGroup heading="Edit or review selection">
        {options.map((option) => (
          <CommandItem
            onSelect={(value) => {
              if (!editor) return;
              const slice = editor.state.selection.content();
              const text = editor.storage.markdown.serializer.serialize(slice.content);
              onSelect(text, value);
            }}
            className="flex gap-2 px-4"
            key={option.value}
            value={option.value}
          >
            <option.icon className="h-4 w-4 text-purple-500" />
            {option.label}
          </CommandItem>
        ))}
        
      </CommandGroup>
      <CommandSeparator />
      {/* <CommandGroup heading="Use AI to do more">
        <CommandItem
          onSelect={() => {
            if (!editor) return;
            const pos = editor.state.selection.from;

            const text = getPrevText(editor, pos);
            onSelect(text, "generate");
          }}
          value="generate"
          className="gap-2 px-4"
        >
          <StepForward className="h-4 w-4 text-purple-500" />
           生成文案(todo)
        </CommandItem>
      </CommandGroup> */}
    </>
  );
};

export default AISelectorCommands;
