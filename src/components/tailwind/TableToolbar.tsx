import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

// 扩展类型声明以确保TypeScript识别表格命令
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    table: {
      addRowAfter: () => ReturnType
      addRowBefore: () => ReturnType
      addColumnAfter: () => ReturnType
      addColumnBefore: () => ReturnType
      deleteRow: () => ReturnType
      deleteColumn: () => ReturnType
      deleteTable: () => ReturnType
      mergeCells: () => ReturnType
      splitCell: () => ReturnType
      insertTable: (options?: { rows?: number; cols?: number; withHeaderRow?: boolean }) => ReturnType
    }
  }
}

export const TableToolbar = Extension.create({
  name: 'tableToolbar',

  onCreate() {
    const editor = this.editor;
    if (!editor) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'fixed hidden gap-2 p-2 bg-white rounded-lg shadow-lg z-50 border';
    toolbar.id = 'table-toolbar';
    
    const buttons = [
      { 
        text: '添加行', 
        cmd: () => {
          console.log('点击添加行');
          if (editor.commands.addRowAfter) {
            const result = editor.commands.addRowAfter();
            console.log('添加行结果:', result);
          } else {
            console.warn('addRowAfter 命令不可用');
          }
        }
      },
      { 
        text: '添加列', 
        cmd: () => {
          console.log('点击添加列');
          if (editor.commands.addColumnAfter) {
            const result = editor.commands.addColumnAfter();
            console.log('添加列结果:', result);
          } else {
            console.warn('addColumnAfter 命令不可用');
          }
        }
      },
      { 
        text: '删除行', 
        cmd: () => {
          console.log('点击删除行');
          if (editor.commands.deleteRow) {
            const result = editor.commands.deleteRow();
            console.log('删除行结果:', result);
          } else {
            console.warn('deleteRow 命令不可用');
          }
        }
      },
      { 
        text: '删除列', 
        cmd: () => {
          console.log('点击删除列');
          if (editor.commands.deleteColumn) {
            const result = editor.commands.deleteColumn();
            console.log('删除列结果:', result);
          } else {
            console.warn('deleteColumn 命令不可用');
          }
        }
      },
      { 
        text: '删除表格', 
        cmd: () => {
          console.log('点击删除表格');
          if (editor.commands.deleteTable) {
            const result = editor.commands.deleteTable();
            console.log('删除表格结果:', result);
          } else {
            console.warn('deleteTable 命令不可用');
          }
        }
      },
    ];

    buttons.forEach(({ text, cmd }) => {
      const button = document.createElement('button');
      button.className = `px-3 py-1 text-xs bg-white border rounded hover:bg-gray-50 transition-colors`;
      button.textContent = text;
      button.type = 'button';
      
      // 使用 addEventListener 而不是 onclick
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`点击了按钮: ${text}`);
        cmd();
      });
      
      // 防止按钮获得焦点时编辑器失去焦点
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      
      toolbar.appendChild(button);
    });

    document.body.appendChild(toolbar);

    const updateToolbarPosition = () => {
      const { selection } = editor.state;
      const { from } = selection;
      
      try {
        // 检查当前选择是否在表格内
        const isInTable = editor.isActive('table');
        console.log('是否在表格内:', isInTable);
        
        if (isInTable) {
          const start = editor.view.coordsAtPos(from);
          toolbar.style.left = `${start.left}px`;
          toolbar.style.top = `${start.top - 60}px`;
          toolbar.style.display = 'flex';
          console.log('显示表格工具栏');
        } else {
          toolbar.style.display = 'none';
          console.log('隐藏表格工具栏');
        }
      } catch (error) {
        console.error('更新工具栏位置失败:', error);
        toolbar.style.display = 'none';
      }
    };

    // 延迟绑定事件，确保编辑器完全初始化
    setTimeout(() => {
      editor.on('selectionUpdate', updateToolbarPosition);
      editor.on('focus', updateToolbarPosition);
      editor.on('blur', () => {
        setTimeout(() => {
          if (!editor.isFocused) {
            toolbar.style.display = 'none';
          }
        }, 200);
      });
    }, 100);

    // 将toolbar实例保存到扩展中
    (this as any).toolbar = toolbar;
  },

  onDestroy() {
    const toolbar = (this as any).toolbar;
    if (toolbar && toolbar.parentNode) {
      toolbar.parentNode.removeChild(toolbar);
    }
  },

  addProseMirrorPlugins() {
    return [];
  }
})