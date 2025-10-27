'use client'

import AdvancedEditor from './components/tailwind/advanced-editor'
import { novelcopy } from './lib/copyContent'
import { Copy } from './types/Model'

interface SectionEditPageProps {
  copy?: Copy | null;
  saveCopy?: (copy: Copy) => Promise<void>;
}

export default function SectionEditPage({ copy, saveCopy }: SectionEditPageProps) {
  // 如果没有传入 copy，则提供一个占位对象
  const fallbackCopy: Copy = {
    id: 'local-demo',
    content: (() => {
      if (copy?.content) {
        try {
          JSON.parse(copy.content);
          return copy.content;
        } catch {
          return JSON.stringify(novelcopy('', ''));
        }
      }
      return JSON.stringify(novelcopy('', ''));
    })(),
    pxh: 0,
    status: 'active',
    createdAt: new Date(),
    richContent: copy?.richContent || '',
    pptContent: copy?.pptContent || '',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <AdvancedEditor 
          copy={copy || fallbackCopy}
          saveCopy={saveCopy}
          showExportMD={true}
          showScriptMaking={false}
          showPPTMaking={false}
          showSave={true}
          showShare={false}
        />
      </div>
    </div>
  )
}