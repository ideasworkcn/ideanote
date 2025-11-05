// 模板存储工具 - 用于保存用户自定义的提示词
export interface CustomTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateStorageData {
  customTemplates: CustomTemplate[];
  version: number;
}

const STORAGE_KEY = 'ideanote_custom_templates';
const CURRENT_VERSION = 1;

/**
 * 获取所有自定义模板
 */
export function getCustomTemplates(): CustomTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const data: TemplateStorageData = JSON.parse(stored);
    
    // 检查版本兼容性
    if (data.version !== CURRENT_VERSION) {
      console.log('模板存储版本升级，当前数据将被重置');
      return [];
    }
    
    return data.customTemplates || [];
  } catch (error) {
    console.error('获取自定义模板失败:', error);
    return [];
  }
}

/**
 * 保存自定义模板
 */
export function saveCustomTemplate(template: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>): CustomTemplate {
  const templates = getCustomTemplates();
  
  const newTemplate: CustomTemplate = {
    ...template,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  templates.push(newTemplate);
  
  const data: TemplateStorageData = {
    customTemplates: templates,
    version: CURRENT_VERSION
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newTemplate;
  } catch (error) {
    console.error('保存自定义模板失败:', error);
    throw new Error('保存失败，可能是存储空间不足');
  }
}

/**
 * 更新自定义模板
 */
export function updateCustomTemplate(id: string, updates: Partial<Omit<CustomTemplate, 'id' | 'createdAt'>>): CustomTemplate | null {
  const templates = getCustomTemplates();
  const index = templates.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: Date.now()
  };
  
  const data: TemplateStorageData = {
    customTemplates: templates,
    version: CURRENT_VERSION
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return templates[index];
  } catch (error) {
    console.error('更新自定义模板失败:', error);
    throw new Error('更新失败，可能是存储空间不足');
  }
}

/**
 * 删除自定义模板
 */
export function deleteCustomTemplate(id: string): boolean {
  const templates = getCustomTemplates();
  const filteredTemplates = templates.filter(t => t.id !== id);
  
  if (filteredTemplates.length === templates.length) {
    return false; // 没有找到要删除的模板
  }
  
  const data: TemplateStorageData = {
    customTemplates: filteredTemplates,
    version: CURRENT_VERSION
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('删除自定义模板失败:', error);
    throw new Error('删除失败');
  }
}

/**
 * 获取单个自定义模板
 */
export function getCustomTemplate(id: string): CustomTemplate | null {
  const templates = getCustomTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * 清空所有自定义模板
 */
export function clearCustomTemplates(): void {
  const data: TemplateStorageData = {
    customTemplates: [],
    version: CURRENT_VERSION
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('清空自定义模板失败:', error);
    throw new Error('清空失败');
  }
}

/**
 * 导出模板数据
 */
export function exportTemplates(): string {
  const templates = getCustomTemplates();
  return JSON.stringify({
    templates,
    exportDate: new Date().toISOString(),
    version: CURRENT_VERSION
  }, null, 2);
}

/**
 * 导入模板数据
 */
export function importTemplates(jsonString: string): number {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.templates || !Array.isArray(data.templates)) {
      throw new Error('无效的导入数据格式');
    }
    
    // 验证模板格式
    const validTemplates: CustomTemplate[] = data.templates.filter((template: any) => {
      return template.title && template.description && template.prompt;
    });
    
    // 为导入的模板生成新的ID
    const templatesWithNewIds = validTemplates.map((template: any) => ({
      ...template,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    
    // 合并现有模板
    const existingTemplates = getCustomTemplates();
    const mergedTemplates = [...existingTemplates, ...templatesWithNewIds];
    
    const storageData: TemplateStorageData = {
      customTemplates: mergedTemplates,
      version: CURRENT_VERSION
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    return templatesWithNewIds.length;
  } catch (error) {
    console.error('导入模板失败:', error);
    throw new Error('导入失败：' + (error as Error).message);
  }
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 检查存储空间
 */
export function checkStorageSpace(): { used: number; remaining: number; total: number } {
  try {
    const testKey = '__storage_test__';
    const testData = 'a'.repeat(1024); // 1KB 测试数据
    
    // 测试写入
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    
    // 估算已用空间
    let totalLength = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalLength += localStorage[key].length + key.length;
      }
    }
    
    // localStorage 通常限制为 5-10MB
    const totalSpace = 5 * 1024 * 1024; // 5MB 估算
    const usedSpace = totalLength;
    const remainingSpace = Math.max(0, totalSpace - usedSpace);
    
    return {
      used: Math.round(usedSpace / 1024), // KB
      remaining: Math.round(remainingSpace / 1024), // KB
      total: Math.round(totalSpace / 1024) // KB
    };
  } catch (error) {
    console.error('检查存储空间失败:', error);
    return { used: 0, remaining: 0, total: 0 };
  }
}