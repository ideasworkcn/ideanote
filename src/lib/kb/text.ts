// 仅使用 Markdown 文本，不再进行节点转换
function extractTitleFromMarkdown(markdown: string): string {
  try {
    const lines = String(markdown || '').split(/\r?\n/);
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      const m = s.match(/^#{1,6}\s*(.+)$/); // Markdown heading
      if (m) return m[1].trim();
      // 退化为首个非空行作为标题
      return s.replace(/^[-*]\s*/, '').trim();
    }
    return '';
  } catch {
    return '';
  }
}


export interface KBDoc {
  id: string;
  title: string;
  text: string;
  updatedAt: number;
}

export function buildKBDoc(id: string, markdownStr: string): KBDoc {
  const text = typeof markdownStr === 'string' ? markdownStr : '';
  const title = extractTitleFromMarkdown(text) || id;
  return {
    id,
    title,
    text,
    updatedAt: Date.now(),
  };
}