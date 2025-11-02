export interface Copy {
  id: string;
  content?: string;
  pxh?: number;
  status?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  richContent?: string;
  pptContent?: string;
}

export interface CopyItem {
  id: string;
  fileName: string;
  createdAt: string;
  modifiedAt: string;
  size: number;
}




