import { createImageUpload } from "novel/plugins";
import { toast } from "sonner";

const onUpload = (file: File) => {
  const promise = new Promise<string>(async (resolve, reject) => {
    try {
      console.log("开始上传图片:", file.name, "大小:", file.size, "类型:", file.type);
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        reject(new Error('只支持图片文件'));
        return;
      }

      // 将文件转换为ArrayBuffer，然后转换为Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 调用Electron API保存图片到本地
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.filesystem?.saveImage) {
        reject(new Error('图片保存功能不可用'));
        return;
      }

      console.log("调用Electron API保存图片...");
       const result = await electronAPI.filesystem.saveImage(uint8Array, file.name);
      
      if (result.success && result.relativePath) {
        console.log("图片保存成功:", result.relativePath);
        resolve(result.relativePath);
      } else {
        console.error("图片保存失败:", result.error);
        reject(new Error(result.error || '图片保存失败'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      reject(error);
    }
  });

  return promise;
};

export const uploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    console.log(111)
    if (!file.type.includes("image/")) {
      console.log("Invalid file type");
      toast.error("File type not supported.");
      return false;
    }
    if (file.size / 1024 / 1024 > 20) {
      console.log("File too large");
      toast.error("File size too big (max 20MB).");
      return false;
    }
    console.log("File validation passed");
    return true;
  },
});
