import { Node } from "@tiptap/core";
import mermaid from "mermaid";
import { Edit2, Download } from 'lucide-react';


export const MermaidExtension = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: { default: 'graph TD;\n  A-->B' },
      diagramId: {
        default: null,
        parseHTML: element => element.getAttribute('data-diagram-id'),
        renderHTML: attributes => ({
          'data-diagram-id': attributes.diagramId
        })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }];
  },

  renderHTML({ node }) {
    return ['div', { 
      'data-mermaid': '',
      'data-code': node.attrs.code,
      'data-diagram-id': node.attrs.diagramId || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      class: 'border border-gray-200 p-4 rounded-lg my-4 cursor-pointer hover:bg-gray-50 transition-colors' 
    }, node.attrs.code];  // 将代码作为内容保存
  },

  addNodeView() {
    return ({ node, editor }) => {
      const container = document.createElement('div');
      container.className = 'relative w-full';


      // 动态加载 Mermaid
      const initMermaid = async () => {
          mermaid.initialize({ startOnLoad: false , securityLevel: 'loose'});
      };

      // 渲染图表
      const render = async () => {
        await initMermaid();
        try {
            const { svg } = await mermaid.render(
                node.attrs.diagramId || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                node.attrs.code
            );

          const oldSvg = container.querySelector('svg');
          if (oldSvg) oldSvg.remove();
          
          container.innerHTML = svg;
            // 为生成的 SVG 添加居中样式
            const newSvg = container.querySelector('svg');
            if (newSvg) {
                newSvg.style.margin = '0 auto';
                newSvg.style.width = 'auto';
                newSvg.style.height = 'auto';
                newSvg.style.maxHeight = '400px';
                newSvg.style.minHeight = '100px';
                newSvg.style.display = 'block';
                newSvg.style.maxWidth = '600px';
                // 保持宽高比
                newSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }

        } catch (e) {
          container.innerHTML = `
            <div class="p-4 border border-red-500/20 bg-red-50 text-red-600 rounded-md">
              ${e instanceof Error ? e.message : '图表渲染错误'}
            </div>
          `;
        }
      };

      // 点击编辑
      container.onclick = () => {
        if (!editor.isEditable) return;

      };

      render();
      return { dom: container };
    };
  },
});