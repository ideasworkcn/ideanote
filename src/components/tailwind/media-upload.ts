import { createImageUpload } from "novel/plugins";
import { toast } from "sonner";

export interface MediaUploadOptions {
  fileType: 'video' | 'audio' | 'image';
  maxSizeMB?: number;
}

const onMediaUpload = (file: File, options: MediaUploadOptions) => {
  const promise = new Promise<string>(async (resolve, reject) => {
    try {
      console.log(`开始上传${options.fileType}文件:`, file.name, "大小:", file.size, "类型:", file.type);
      
      // 文件类型验证
      const validTypes = {
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      };

      const expectedPrefix = `${options.fileType}/`;
      if (!file.type.startsWith(expectedPrefix) && !validTypes[options.fileType].includes(file.type)) {
        reject(new Error(`不支持的${options.fileType}文件类型: ${file.type}`));
        return;
      }

      // 将文件转换为ArrayBuffer，然后转换为Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 调用Electron API保存媒体文件到本地
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.filesystem?.saveMedia) {
        reject(new Error('媒体文件保存功能不可用'));
        return;
      }

      console.log(`调用Electron API保存${options.fileType}文件...`);
      const result = await electronAPI.filesystem.saveMedia(uint8Array, file.name, options.fileType);
      
      if (result.success && result.relativePath) {
        console.log(`${options.fileType}文件保存成功:`, result.relativePath);
        resolve(result.relativePath);
      } else {
        console.error(`${options.fileType}文件保存失败:`, result.error);
        reject(new Error(result.error || `${options.fileType}文件保存失败`));
      }
    } catch (error) {
      console.error('Media upload error:', error);
      reject(error);
    }
  });

  return promise;
};

export const createMediaUpload = (options: MediaUploadOptions) => {
  return createImageUpload({
    onUpload: (file: File) => onMediaUpload(file, options),
    validateFn: (file: File) => {
      const validTypes = {
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      };

      const expectedPrefix = `${options.fileType}/`;
      const isValidType = file.type.startsWith(expectedPrefix) || validTypes[options.fileType].includes(file.type);
      
      if (!isValidType) {
        toast.error(`不支持的${options.fileType}文件类型: ${file.type}`);
        return false;
      }

      const maxSizeMB = options.maxSizeMB || (options.fileType === 'video' ? 100 : 20); // 视频默认100MB，音频和图片默认20MB
      if (file.size / 1024 / 1024 > maxSizeMB) {
        toast.error(`${options.fileType}文件过大 (最大 ${maxSizeMB}MB)。`);
        return false;
      }

      return true;
    },
  });
};

// 预设的媒体上传函数
export const videoUploadFn = createMediaUpload({
  fileType: 'video',
  maxSizeMB: 100,
});

export const audioUploadFn = createMediaUpload({
  fileType: 'audio',
  maxSizeMB: 20,
});

export const imageUploadFn = createMediaUpload({
  fileType: 'image',
  maxSizeMB: 20,
});

// 通用媒体上传函数，用于slash-command.tsx
export const mediaUploadFn = async (file: File, fileType: 'video' | 'audio' | 'image') => {
  try {
    // 直接调用底层的onMediaUpload函数
    const result = await onMediaUpload(file, { fileType });
    return {
      success: true,
      path: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
};

// 创建支持多种媒体类型的拖拽处理函数
export const handleMediaDrop = (fileType: 'video' | 'audio' | 'image') => {
  return (view: any, event: DragEvent, moved: boolean, uploadFn: any) => {
    if (!event.dataTransfer?.files?.length) {
      return false;
    }

    const files = Array.from(event.dataTransfer.files);
    const validFiles = files.filter(file => {
      const validTypes = {
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      };

      const expectedPrefix = `${fileType}/`;
      return file.type.startsWith(expectedPrefix) || validTypes[fileType].includes(file.type);
    });

    if (validFiles.length === 0) {
      return false;
    }

    event.preventDefault();

    // 处理文件上传
    validFiles.forEach(async (file) => {
      try {
        const uploadResult = await mediaUploadFn(file, fileType);
        if (uploadResult.success) {
          // 在编辑器中插入媒体内容
          const { schema } = view.state;
          const nodeType = fileType === 'video' ? 'video' : fileType === 'audio' ? 'audio' : 'image';
          
          const node = nodeType === 'image' 
            ? schema.nodes.image.create({ src: uploadResult.path })
            : schema.nodes[nodeType].create({ 
                src: uploadResult.path,
                title: file.name
              });

          const transaction = view.state.tr.insert(view.state.selection.from, node);
          view.dispatch(transaction);
        }
      } catch (error) {
        console.error(`${fileType}文件处理失败:`, error);
      }
    });

    return true;
  };
};

// 创建支持多种媒体类型的粘贴处理函数
export const handleMediaPaste = (fileType: 'video' | 'audio' | 'image') => {
  return (view: any, event: ClipboardEvent, uploadFn: any) => {
    if (!event.clipboardData?.files?.length) {
      return false;
    }

    const files = Array.from(event.clipboardData.files);
    const validFiles = files.filter(file => {
      const validTypes = {
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
      };

      const expectedPrefix = `${fileType}/`;
      return file.type.startsWith(expectedPrefix) || validTypes[fileType].includes(file.type);
    });

    if (validFiles.length === 0) {
      return false;
    }

    event.preventDefault();

    // 处理文件上传
    validFiles.forEach(async (file) => {
      try {
        const uploadResult = await mediaUploadFn(file, fileType);
        if (uploadResult.success) {
          // 在编辑器中插入媒体内容
          const { schema } = view.state;
          const nodeType = fileType === 'video' ? 'video' : fileType === 'audio' ? 'audio' : 'image';
          
          const node = nodeType === 'image' 
            ? schema.nodes.image.create({ src: uploadResult.path })
            : schema.nodes[nodeType].create({ 
                src: uploadResult.path,
                title: file.name
              });

          const transaction = view.state.tr.insert(view.state.selection.from, node);
          view.dispatch(transaction);
        }
      } catch (error) {
        console.error(`${fileType}文件处理失败:`, error);
      }
    });

    return true;
  };
};