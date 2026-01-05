<template>
  <div class="file-manager">
    <div class="toolbar">
      <el-upload
        v-if="canUpload"
        :show-file-list="false"
        :http-request="handleUpload"
      >
        <el-button type="primary">
          <IconifyIconOffline icon="ri:upload-2-line" class="mr-1" />
          上传文件
        </el-button>
      </el-upload>
      <el-button v-if="canCreateFolder" @click="openCreateFolder">
        <IconifyIconOffline icon="ri:folder-add-line" class="mr-1" />
        新建文件夹
      </el-button>
      <el-button @click="refresh">
        <IconifyIconOffline icon="ri:refresh-line" class="mr-1" />
        刷新
      </el-button>
      <div class="current-path">当前目录：{{ currentFolderName }}</div>
    </div>
    <div class="layout">
      <div class="tree-panel">
        <div class="tree-header">
          <el-button text @click="selectRoot">根目录</el-button>
        </div>
        <el-tree
          :data="folderTree"
          node-key="id"
          :props="treeProps"
          highlight-current
          default-expand-all
          @node-click="handleFolderSelect"
        />
      </div>
      <div class="content-panel">
        <div class="section">
          <div class="section-title">文件夹</div>
          <el-table :data="folders" stripe :loading="loading">
            <el-table-column prop="name" label="名称" min-width="180">
              <template #default="{ row }">
                <div class="name-cell">
                  <IconifyIconOnline
                    :icon="getFolderIcon()"
                    class="mr-2 file-icon folder-icon"
                  />
                  {{ row.name }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="路径" min-width="200">
              <template #default="{ row }">
                {{ getFolderPathLabel(row.parent) }}
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" min-width="160">
              <template #default="{ row }">
                {{ formatDate(row.updated_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="200">
              <template #default="{ row }">
                <el-button
                  v-if="canRenameFolder"
                  type="primary"
                  link
                  @click="openRenameFolder(row)"
                >
                  <IconifyIconOffline icon="ri:edit-2-line" class="mr-1" />
                  重命名
                </el-button>
                <el-button
                  v-if="canMoveFolder"
                  type="primary"
                  link
                  @click="openMoveFolder(row)"
                >
                  <IconifyIconOffline icon="ri:drag-move-line" class="mr-1" />
                  移动
                </el-button>
                <el-button
                  v-if="canDeleteFolder"
                  type="danger"
                  link
                  @click="confirmDeleteFolder(row)"
                >
                  <IconifyIconOffline icon="ri:delete-bin-line" class="mr-1" />
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="section">
          <div class="section-title">文件</div>
          <el-table :data="files" stripe :loading="loading">
            <el-table-column prop="name" label="名称" min-width="200">
              <template #default="{ row }">
                <div class="name-cell">
                  <IconifyIconOnline
                    :icon="getFileIcon(row)"
                    :class="['mr-2', 'file-icon', getFileIconClass(row)]"
                  />
                  {{ row.name }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="类型" min-width="140">
              <template #default="{ row }">
                {{ formatType(row) }}
              </template>
            </el-table-column>
            <el-table-column label="大小" min-width="120">
              <template #default="{ row }">
                {{ formatSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column label="路径" min-width="200">
              <template #default="{ row }">
                {{ getFolderPathLabel(row.folder) }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="上传时间" min-width="160">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="分享" min-width="100">
              <template #default="{ row }">
                {{ row.shareUrl || row.share_slug ? "公开" : "未分享" }}
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="260">
              <template #default="{ row }">
                <el-button type="primary" link @click="previewFile(row)">
                  <IconifyIconOffline icon="ri:eye-line" class="mr-1" />
                  预览
                </el-button>
                <el-button type="primary" link @click="downloadFile(row)">
                  <IconifyIconOffline icon="ri:download-2-line" class="mr-1" />
                  下载
                </el-button>
                <el-button
                  v-if="canShare"
                  type="primary"
                  link
                  @click="shareFileLink(row)"
                >
                  <IconifyIconOffline icon="ri:share-line" class="mr-1" />
                  分享
                </el-button>
                <el-button
                  v-if="canRenameFile"
                  type="primary"
                  link
                  @click="openRenameFile(row)"
                >
                  <IconifyIconOffline icon="ri:edit-2-line" class="mr-1" />
                  重命名
                </el-button>
                <el-button
                  v-if="canMoveFile"
                  type="primary"
                  link
                  @click="openMoveFile(row)"
                >
                  <IconifyIconOffline icon="ri:drag-move-line" class="mr-1" />
                  移动
                </el-button>
                <el-button
                  v-if="canDeleteFile"
                  type="danger"
                  link
                  @click="confirmDeleteFile(row)"
                >
                  <IconifyIconOffline icon="ri:delete-bin-line" class="mr-1" />
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <el-dialog v-model="folderDialog.visible" :title="folderDialog.title">
      <el-input v-model="folderDialog.name" placeholder="请输入文件夹名称" />
      <template #footer>
        <el-button @click="folderDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitFolderDialog">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="fileDialog.visible" :title="fileDialog.title">
      <el-input v-model="fileDialog.name" placeholder="请输入文件名称" />
      <template #footer>
        <el-button @click="fileDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitFileDialog">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="moveDialog.visible" title="移动到">
      <el-select v-model="moveDialog.targetFolderId" placeholder="选择目标目录">
        <el-option
          v-for="option in folderOptions"
          :key="option.id"
          :label="option.label"
          :value="option.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="moveDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitMoveDialog">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { hasPerms } from "@/utils/auth";
import {
  createFolder,
  deleteFile,
  deleteFolder,
  getFileList,
  getFolderTree,
  moveFile,
  moveFolder,
  renameFile,
  renameFolder,
  shareFile,
  uploadFile,
  type FileEntryItem,
  type FileFolderItem
} from "@/api/files";

type FolderNode = FileFolderItem & { children?: FolderNode[] };

const treeProps = {
  label: "name",
  children: "children"
};

const loading = ref(false);
const folderTree = ref<FolderNode[]>([]);
const folderIndex = ref<Map<number, FolderNode>>(new Map());
const folders = ref<FileFolderItem[]>([]);
const files = ref<FileEntryItem[]>([]);
const currentFolderId = ref<number | null>(null);
const currentFolderName = ref<string>("根目录");

const folderDialog = reactive({
  visible: false,
  title: "",
  name: "",
  targetId: 0,
  mode: "create"
});

const fileDialog = reactive({
  visible: false,
  title: "",
  name: "",
  targetId: 0
});

const moveDialog = reactive({
  visible: false,
  targetFolderId: 0,
  targetId: 0,
  mode: "file"
});

const folderOptions = computed(() => {
  const options: Array<{ id: number; label: string }> = [
    { id: 0, label: "根目录" }
  ];
  const traverse = (nodes: FolderNode[], prefix = "") => {
    nodes.forEach(node => {
      options.push({
        id: node.id,
        label: prefix ? `${prefix}/${node.name}` : node.name
      });
      if (node.children?.length) {
        traverse(node.children, prefix ? `${prefix}/${node.name}` : node.name);
      }
    });
  };
  traverse(folderTree.value);
  return options;
});

const canUpload = computed(() => hasPerms("files:upload"));
const canDeleteFile = computed(() => hasPerms("files:delete"));
const canRenameFile = computed(() => hasPerms("files:rename"));
const canMoveFile = computed(() => hasPerms("files:move"));
const canShare = computed(() => hasPerms("files:share"));
const canCreateFolder = computed(() => hasPerms("files:folder:create"));
const canDeleteFolder = computed(() => hasPerms("files:folder:delete"));
const canRenameFolder = computed(() => hasPerms("files:folder:rename"));
const canMoveFolder = computed(() => hasPerms("files:folder:move"));

function buildTree(items: FileFolderItem[]) {
  const nodes = new Map<number, FolderNode>();
  const roots: FolderNode[] = [];
  items.forEach(item => nodes.set(item.id, { ...item }));
  folderIndex.value = nodes;
  nodes.forEach(node => {
    const parentId = node.parent ?? 0;
    if (!parentId || parentId === node.id) {
      roots.push(node);
      return;
    }
    const parent = nodes.get(parentId);
    if (parent) {
      parent.children = parent.children ?? [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

async function loadFolderTree() {
  const { data } = await getFolderTree();
  folderTree.value = buildTree(data ?? []);
}

async function loadList() {
  loading.value = true;
  try {
    const { data } = await getFileList(currentFolderId.value);
    folders.value = data?.folders ?? [];
    files.value = data?.files ?? [];
  } finally {
    loading.value = false;
  }
}

function refresh() {
  loadFolderTree();
  loadList();
}

function selectRoot() {
  currentFolderId.value = null;
  currentFolderName.value = "根目录";
  loadList();
}

function handleFolderSelect(node: FolderNode) {
  currentFolderId.value = node.id;
  currentFolderName.value = node.name;
  loadList();
}

function openCreateFolder() {
  folderDialog.visible = true;
  folderDialog.title = "新建文件夹";
  folderDialog.name = "";
  folderDialog.targetId = 0;
  folderDialog.mode = "create";
}

function openRenameFolder(folder: FileFolderItem) {
  folderDialog.visible = true;
  folderDialog.title = "重命名文件夹";
  folderDialog.name = folder.name;
  folderDialog.targetId = folder.id;
  folderDialog.mode = "rename";
}

async function submitFolderDialog() {
  const name = folderDialog.name.trim();
  if (!name) {
    ElMessage.warning("请输入文件夹名称");
    return;
  }
  if (folderDialog.mode === "create") {
    await createFolder(name, currentFolderId.value ?? 0);
  } else {
    await renameFolder(folderDialog.targetId, name);
  }
  folderDialog.visible = false;
  refresh();
}

function openMoveFolder(folder: FileFolderItem) {
  moveDialog.visible = true;
  moveDialog.targetFolderId = currentFolderId.value ?? 0;
  moveDialog.targetId = folder.id;
  moveDialog.mode = "folder";
}

function confirmDeleteFolder(folder: FileFolderItem) {
  ElMessageBox.confirm(
    `确定删除文件夹 "${folder.name}" 吗？子文件夹和文件会一起删除。`,
    "提示",
    { type: "warning" }
  ).then(async () => {
    await deleteFolder(folder.id);
    refresh();
  });
}

function openRenameFile(file: FileEntryItem) {
  fileDialog.visible = true;
  fileDialog.title = "重命名文件";
  fileDialog.name = file.name;
  fileDialog.targetId = file.id;
}

async function submitFileDialog() {
  const name = fileDialog.name.trim();
  if (!name) {
    ElMessage.warning("请输入文件名称");
    return;
  }
  await renameFile(fileDialog.targetId, name);
  fileDialog.visible = false;
  loadList();
}

function openMoveFile(file: FileEntryItem) {
  moveDialog.visible = true;
  moveDialog.targetFolderId = currentFolderId.value ?? 0;
  moveDialog.targetId = file.id;
  moveDialog.mode = "file";
}

async function submitMoveDialog() {
  if (moveDialog.mode === "file") {
    await moveFile(moveDialog.targetId, moveDialog.targetFolderId || 0);
  } else {
    await moveFolder(moveDialog.targetId, moveDialog.targetFolderId || 0);
  }
  moveDialog.visible = false;
  refresh();
}

function confirmDeleteFile(file: FileEntryItem) {
  ElMessageBox.confirm(`确定删除文件 "${file.name}" 吗？`, "提示", {
    type: "warning"
  }).then(async () => {
    await deleteFile(file.id);
    loadList();
  });
}

async function shareFileLink(file: FileEntryItem) {
  const { data } = await shareFile(file.id);
  const shareUrl = data?.shareUrl || file.shareUrl || "";
  if (!shareUrl) {
    ElMessage.error("分享链接生成失败");
    return;
  }
  try {
    await navigator.clipboard.writeText(shareUrl);
    ElMessage.success("分享链接已复制");
  } catch {
    ElMessage.success(`分享链接：${shareUrl}`);
  }
}

function previewFile(file: FileEntryItem) {
  if (file.previewUrl) {
    window.open(file.previewUrl, "_blank");
  }
}

function downloadFile(file: FileEntryItem) {
  if (file.downloadUrl) {
    window.open(file.downloadUrl, "_blank");
  }
}

async function handleUpload(option: any) {
  try {
    await uploadFile(option.file, currentFolderId.value ?? 0);
    ElMessage.success("上传成功");
    loadList();
    option.onSuccess?.();
  } catch (error) {
    option.onError?.(error);
  }
}

function formatSize(size?: number) {
  if (!size) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatType(file: FileEntryItem) {
  if (file.content_type) return file.content_type;
  const name = file.name || "";
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index + 1).toLowerCase() : "-";
}

function getFileIcon(file: FileEntryItem) {
  const type = formatType(file);
  if (
    file.content_type?.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(type)
  ) {
    return "ep:picture";
  }
  if (
    file.content_type?.startsWith("video/") ||
    ["mp4", "mov", "avi", "mkv", "webm"].includes(type)
  ) {
    return "ep:video-camera";
  }
  if (
    file.content_type?.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "flac"].includes(type)
  ) {
    return "ep:headset";
  }
  if (["pdf"].includes(type)) return "ri:file-pdf-2-line";
  if (["doc", "docx"].includes(type)) return "ri:file-word-2-line";
  if (["xls", "xlsx", "csv"].includes(type)) return "ri:file-excel-2-line";
  if (["ppt", "pptx"].includes(type)) return "ri:file-ppt-2-line";
  if (["zip", "rar", "7z", "tar", "gz"].includes(type))
    return "ri:file-zip-2-line";
  if (["txt", "md"].includes(type)) return "ri:file-text-2-line";
  return "ep:document";
}

function getFileIconClass(file: FileEntryItem) {
  const type = formatType(file);
  if (
    file.content_type?.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(type)
  ) {
    return "file-icon-image";
  }
  if (
    file.content_type?.startsWith("video/") ||
    ["mp4", "mov", "avi", "mkv", "webm"].includes(type)
  ) {
    return "file-icon-video";
  }
  if (
    file.content_type?.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "flac"].includes(type)
  ) {
    return "file-icon-audio";
  }
  if (["pdf"].includes(type)) return "file-icon-pdf";
  if (["doc", "docx"].includes(type)) return "file-icon-doc";
  if (["xls", "xlsx", "csv"].includes(type)) return "file-icon-sheet";
  if (["ppt", "pptx"].includes(type)) return "file-icon-slide";
  if (["zip", "rar", "7z", "tar", "gz"].includes(type))
    return "file-icon-archive";
  if (["txt", "md"].includes(type)) return "file-icon-text";
  return "file-icon-generic";
}

function getFolderIcon() {
  return "ep:folder";
}

function getFolderPathLabel(folderId?: number | null) {
  if (!folderId) return "根目录";
  const names: string[] = [];
  let current = folderIndex.value.get(folderId);
  const visited = new Set<number>();
  while (current) {
    if (visited.has(current.id)) {
      names.unshift(current.name);
      break;
    }
    visited.add(current.id);
    names.unshift(current.name);
    if (!current.parent) break;
    current = folderIndex.value.get(current.parent);
  }
  return names.length ? `/${names.join("/")}` : "根目录";
}

onMounted(async () => {
  await loadFolderTree();
  await loadList();
});
</script>

<style scoped>
.file-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.current-path {
  margin-left: auto;
  font-size: 13px;
  color: #606266;
}

.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
}

.tree-panel {
  padding: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.tree-header {
  margin-bottom: 8px;
}

.content-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  padding: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.section-title {
  margin-bottom: 12px;
  font-weight: 600;
}

.name-cell {
  display: inline-flex;
  align-items: center;
}

.file-icon {
  font-size: 18px;
}

.folder-icon {
  color: #f2c94c;
}

.file-icon-image {
  color: #2f80ed;
}

.file-icon-video {
  color: #eb5757;
}

.file-icon-audio {
  color: #27ae60;
}

.file-icon-pdf {
  color: #bb2d3b;
}

.file-icon-doc {
  color: #2f80ed;
}

.file-icon-sheet {
  color: #219653;
}

.file-icon-slide {
  color: #f2994a;
}

.file-icon-archive {
  color: #9b51e0;
}

.file-icon-text {
  color: #4f4f4f;
}

.file-icon-generic {
  color: #828282;
}

@media (width <= 980px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
