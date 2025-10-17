import { Download, ChevronDown, Loader2 } from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

export interface VoiceMenuItem {
  name: string;
  code: number;
  speed:number;
}

const VOICES: VoiceMenuItem[] = [
        {
          name: "新闻女声：智丹",
          code: 101012,
          speed: 1.3,
        },
        {
          name: "新闻男声：智宁",
          code: 101014,
          speed: 1.2,
        },
        {
          name: "通用男声：智奎",
          code: 101031,
          speed: 1.1,
        },
        {
          name: "轻快解说：智友",
          code: 101054,
          speed: 1.0,
        },
        {
          name: "沉稳解说：智方",
          code: 101053,
          speed: 1.1,
        },
        {
          name: "纪录片音：智凯",
          code: 101029,
          speed: 1.2,
        },
        {
          name: "对话女声：爱小桃",
          code: 301038,
          speed: 1.0,
        },
        {
          name: "对话女声：爱小溪",
          code: 301030,
          speed: 1.0,
        },
        {
          name: "聊天女声：智薇",
          code: 101025,
          speed: 1.2,
        },
        {
          name: "对话女声：爱小静",
          code: 301037,
          speed: 1.0,
        },
        {
          name: "对话男声：爱小树",
          code: 301031,
          speed: 1.0,
        },
        {
          name: "英文男声：WeJack",
          code: 101050,
          speed: 1.0,
        },
        {
          name: "英文女声：WeRose",
          code: 101051,
          speed: 1.0,
        },
        {
          name: "日语女声：智美子",
          code: 101057,
          speed: 1.0,
        },
        {
          name: "粤语女声：智彤",
          code: 101019,
          speed: 1.1,
        },
        {
          name: "四川女声：智川",
          code: 101040,
          speed: 1.2,
        },
        {
          name: "东北男声：智林",
          code: 101056,
          speed: 1.1,
        },
];

interface AudioSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AudioSelector = ({ open, onOpenChange }: AudioSelectorProps) => {
  const { editor } = useEditor();
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceMenuItem | null>(null);

  if (!editor) return null;

  const handleDownloadAudio = async (voice: VoiceMenuItem) => {
    const text = editor.state.selection.empty ? editor.getText() : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
    if (text.length > 150) {
      alert("文本长度超过150个字符，无法处理");
      return;
    }

    setSelectedVoice(voice);
    setLoading(true);
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          code: voice.code,
          speed: voice.speed
        }),
      });

      const { success, data } = await response.json();
      if (success && data) {
          // Create audio element and play
          const audio = new Audio(`data:audio/mp3;base64,${data}`);
          audio.play();

          // Convert base64 to ArrayBuffer
          const binaryString = atob(data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // 创建 Blob 时使用的是正确的音频 MIME 类型
          const blob = new Blob([bytes], { type: 'audio/mpeg' });

          // 创建时间戳
          const now = new Date();
          const timestamp = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
          
          // 修改文件扩展名为 .mp3
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${timestamp}_${voice.name}_${voice.speed}x_audio.mp3`; // 改为 .mp3
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('语音生成失败，请稍后重试');
    } finally {
      setLoading(false);
      setSelectedVoice(null);
      onOpenChange(false);
    }
  };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2" variant="ghost">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>语音生成中...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>🎙️语音合成</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={5}
        className="w-64 p-0"
        align="start"
      >
        <div className="flex flex-col">
          <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b">语音选择</div>
          <div className="max-h-64 overflow-y-auto">
            {VOICES.map((voice) => (
              <EditorBubbleItem
                key={voice.name}
                onSelect={() => handleDownloadAudio(voice)}
                className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-all duration-200 rounded-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate">{voice.name}</span>
                </div>
                {loading && selectedVoice?.name === voice.name ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : (
                  <Download className="h-3 w-3 text-muted-foreground" />
                )}
              </EditorBubbleItem>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
