import { createImageUpload } from "novel/plugins";
import { toast } from "sonner";

const onUpload = (file: File) => {
  console.log("File name:", file.name);
  console.log("File type:", file.type);
  console.log("File size:", file.size);
  
  const safeFilename = file.name.replace(/[^\u0020-\u007E]/g, '').replace(/\s+/g, '_');
  console.log(safeFilename);

  console.log("Attempting to call fetch...");
  
  // 获取token
  const token = localStorage.getItem('token');
  
  const promise = fetch("/api/upload/local-img", {
    method: "POST",
    headers: {
      "content-type": file?.type || "application/octet-stream",
      "x-vercel-filename": safeFilename || "image.png",
      "Authorization": `Bearer ${token}`, // 添加Authorization头部
    },
    body: file,
  }).catch((error) => {
    console.error("Fetch error:", error);
    throw error;
  });

  console.log("Fetch promise created");

  return new Promise((resolve, reject) => {
    toast.promise(
      promise.then(async (res) => {
        // Successfully uploaded image
        if (res.status === 200) {
          const { url } = (await res.json()) as { url: string };
          // preload the image
          const image = new Image();
          image.src = url;
          image.onload = () => {
            resolve(url);
          };
        } else if (res.status === 401) {
          resolve(file);
          throw new Error("`BLOB_READ_WRITE_TOKEN` environment variable not found, reading image locally instead.");
        } else if (res.status === 413) {
          // 处理存储空间不足错误
          const errorData = await res.json();
          throw new Error(`存储空间不足：已使用 ${errorData.details?.currentUsage}MB / ${errorData.details?.limit}MB`);
        } else {
          // 尝试获取详细错误信息
          try {
            const errorData = await res.json();
            throw new Error(errorData.error || "Error uploading image. Please try again.");
          } catch {
            throw new Error("Error uploading image. Please try again.");
          }
        }
      }),
      {
        loading: "Uploading image...",
        success: "Image uploaded successfully.",
        error: (e) => {
          reject(e);
          return e.message;
        },
      },
    );
  });
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
