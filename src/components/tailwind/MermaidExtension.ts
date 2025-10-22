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

        // 创建编辑模态框
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl';
        modal.appendChild(modalContent);

        // 创建标题
        const header = document.createElement('div');
        header.className = 'text-lg font-medium mb-4';
        header.textContent = '编辑 Mermaid 图表';
        modalContent.appendChild(header);

        // 创建文本输入框
        const textarea = document.createElement('textarea');
        textarea.value = node.attrs.code;
        textarea.className = 'w-full h-40 p-3 border rounded-lg mb-4 font-mono text-sm whitespace-pre tab-size-4';
        textarea.style.tabSize = '4';
        textarea.wrap = 'off';
        textarea.spellcheck = false;
        modalContent.appendChild(textarea);

        // 创建预览区域
        const preview = document.createElement('div');
        preview.className = 'w-full p-4 border rounded-lg mb-4 bg-gray-50';
        modalContent.appendChild(preview);

        // 预览更新函数
        const updatePreview = async () => {
          try {
            const id = `preview-${Math.random().toString(36).substr(2, 9)}`;
            preview.innerHTML = '';
            const previewContainer = document.createElement('div');
            previewContainer.classList.add('mermaid');
            previewContainer.setAttribute('id', id);
            previewContainer.textContent = textarea.value;
            preview.appendChild(previewContainer);
            
            await mermaid.init(undefined, previewContainer);
          } catch (error) {
            preview.innerHTML = '<div class="text-red-500 p-2">预览失败</div>';
          }
        };

        // 使用防抖优化实时预览
        let debounceTimer: NodeJS.Timeout;
        textarea.oninput = () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            updatePreview();
          }, 300);
        };

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-end gap-2';
        
        // 创建确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700';
        confirmButton.textContent = '确认';
        
        // 创建取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.className = 'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200';
        cancelButton.textContent = '取消';

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        modalContent.appendChild(buttonContainer);

        // 添加到body
        document.body.appendChild(modal);

        // 初始预览
        updatePreview();

        // 确认按钮点击事件
        confirmButton.onclick = async () => {
          try {
            // 更新节点属性
            editor.commands.updateAttributes('mermaid', {
              code: textarea.value,
              diagramId: `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
            
            document.body.removeChild(modal);
          } catch (error) {
            console.error('Mermaid 更新错误:', error);
            alert('图表更新失败，请检查语法');
          }
        };

        // 取消按钮点击事件
        cancelButton.onclick = () => {
          document.body.removeChild(modal);
        };

        // ESC 键关闭弹窗
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleKeyDown);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
      };

      render();
      return { dom: container };
    };
  },
});