import { http } from "@/utils/http";

type Result<T = any> = {
  success: boolean;
  data?: T;
};

export type FileFolderItem = {
  id: number;
  name: string;
  parent?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type FileEntryItem = {
  id: number;
  name: string;
  folder?: number | null;
  size?: number;
  content_type?: string | null;
  created_at?: string;
  updated_at?: string;
  share_slug?: string;
  downloadUrl?: string;
  previewUrl?: string;
  shareUrl?: string;
};

export const getFolderTree = () => {
  return http.request<Result<FileFolderItem[]>>("post", "/files/folder/tree");
};

export const getFileList = (parentId?: number | null) => {
  return http.request<
    Result<{ folders: FileFolderItem[]; files: FileEntryItem[] }>
  >("post", "/files/list", { data: { parentId: parentId ?? 0 } });
};

export const createFolder = (name: string, parentId?: number | null) => {
  return http.request<Result<FileFolderItem>>("post", "/files/folder/create", {
    data: { name, parentId: parentId ?? 0 }
  });
};

export const renameFolder = (id: number, name: string) => {
  return http.request<Result>("post", "/files/folder/rename", {
    data: { id, name }
  });
};

export const moveFolder = (id: number, parentId?: number | null) => {
  return http.request<Result>("post", "/files/folder/move", {
    data: { id, parentId: parentId ?? 0 }
  });
};

export const deleteFolder = (id: number) => {
  return http.request<Result>("post", "/files/folder/delete", {
    data: { id }
  });
};

export const uploadFile = (file: File, folderId?: number | null) => {
  const formData = new FormData();
  formData.append("file", file);
  if (folderId) formData.append("folderId", String(folderId));
  return http.request<Result<FileEntryItem>>("post", "/files/file/upload", {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
};

export const renameFile = (id: number, name: string) => {
  return http.request<Result>("post", "/files/file/rename", {
    data: { id, name }
  });
};

export const moveFile = (id: number, folderId?: number | null) => {
  return http.request<Result>("post", "/files/file/move", {
    data: { id, folderId: folderId ?? 0 }
  });
};

export const deleteFile = (id: number) => {
  return http.request<Result>("post", "/files/file/delete", {
    data: { id }
  });
};

export const shareFile = (id: number, reset?: boolean) => {
  return http.request<Result<{ shareUrl: string; shareSlug: string }>>(
    "post",
    "/files/file/share",
    {
      data: { id, reset: !!reset }
    }
  );
};
