import { Node } from "@tiptap/core";

export const AudioExtension = Node.create({
  name: "audio",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: '' },
      title: { default: '' },
      controls: { default: true },
      preload: { default: 'metadata' }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-audio]' }];
  },

  renderHTML({ node }) {
    return ['div', { 
      'data-audio': '',
      'data-src': node.attrs.src,
      'data-title': node.attrs.title,
      class: 'audio-container border border-gray-200 rounded-lg my-4 p-4 bg-gray-50' 
    }];
  },

  addNodeView() {
    return ({ node, editor }) => {
      const container = document.createElement('div');
      container.className = 'relative w-full';

      // 渲染音频
      const render = () => {
        const audio = document.createElement('audio');
        audio.src = node.attrs.src;
        audio.controls = node.attrs.controls;
        audio.preload = node.attrs.preload;
        audio.className = 'w-full';
        
        if (node.attrs.title) {
          audio.title = node.attrs.title;
        }

        // 错误处理
        audio.onerror = () => {
          container.innerHTML = `
            <div class="p-4 border border-red-500/20 bg-red-50 text-red-600 rounded-md text-center">
              音频加载失败: ${node.attrs.src}
            </div>
          `;
        };

        container.innerHTML = '';
        container.appendChild(audio);
      };

      // 点击编辑
      container.onclick = (e) => {
        // 如果点击的是音频控件，不触发编辑
        if (e.target instanceof HTMLAudioElement && !editor.isEditable) {
          return;
        }
        
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
        header.textContent = '编辑音频';
        modalContent.appendChild(header);

        // 创建文件选择输入
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.style.display = 'none';
        
        // 创建源地址显示区域
        const srcContainer = document.createElement('div');
        srcContainer.className = 'mb-4';
        
        const srcLabel = document.createElement('label');
        srcLabel.className = 'block text-sm font-medium text-gray-700 mb-2';
        srcLabel.textContent = '当前音频地址:';
        srcContainer.appendChild(srcLabel);
        
        const srcDisplay = document.createElement('div');
        srcDisplay.className = 'w-full p-3 border rounded-lg bg-gray-50 mb-2 text-sm text-gray-600 break-all';
        srcDisplay.textContent = node.attrs.src || '未选择音频文件';
        srcContainer.appendChild(srcDisplay);
        
        const selectFileButton = document.createElement('button');
        selectFileButton.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700';
        selectFileButton.textContent = '选择音频文件';
        srcContainer.appendChild(selectFileButton);
        
        modalContent.appendChild(srcContainer);
        modalContent.appendChild(fileInput);

        // 创建标题输入框
        const titleLabel = document.createElement('label');
        titleLabel.className = 'block text-sm font-medium text-gray-700 mb-2';
        titleLabel.textContent = '音频标题:';
        modalContent.appendChild(titleLabel);

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = node.attrs.title;
        titleInput.className = 'w-full p-3 border rounded-lg mb-6';
        titleInput.placeholder = '输入音频标题（可选）';
        modalContent.appendChild(titleInput);

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

        let selectedFilePath = node.attrs.src;

        // 文件选择事件
        fileInput.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              // 使用媒体上传函数上传文件
              const { mediaUploadFn } = await import('./media-upload.js');
              const result = await mediaUploadFn(file, 'audio');
              
              if (result.success && result.path) {
                selectedFilePath = result.path;
                srcDisplay.textContent = result.path;
                srcDisplay.className = 'w-full p-3 border rounded-lg bg-green-50 mb-2 text-sm text-green-700 break-all';
              } else {
                alert('文件上传失败: ' + (result.error || '未知错误'));
              }
            } catch (error) {
              console.error('文件上传错误:', error);
              alert('文件上传失败: ' + (error as Error).message);
            }
          }
        };

        // 选择文件按钮点击事件
        selectFileButton.onclick = () => {
          fileInput.click();
        };

        // 确认按钮点击事件
        confirmButton.onclick = () => {
          try {
            // 更新节点属性
            editor.commands.updateAttributes('audio', {
              src: selectedFilePath,
              title: titleInput.value.trim()
            });
            
            document.body.removeChild(modal);
          } catch (error) {
            console.error('音频更新错误:', error);
            alert('音频更新失败');
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