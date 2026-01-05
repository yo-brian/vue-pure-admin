<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import dayjs from "dayjs";
import type {
  FormInstance,
  UploadFile,
  UploadRequestOptions,
  UploadUserFile
} from "element-plus";
import { message } from "@/utils/message";
import { getAreas } from "@/api/config";
import {
  getHazards,
  transitionHazardStatus,
  updateHazard,
  exportHazardReport,
  type Hazard,
  type HazardLevel,
  type HazardStatus,
  type HazardTaskItemRecordImage,
  type HazardRectificationImage,
  uploadHazardRectificationImage,
  deleteHazardRectificationImage
} from "@/api/hazards";
import {
  uploadTaskItemRecordImage,
  deleteTaskItemRecordImage
} from "@/api/tasks";
import { getUsers, type AppUser } from "@/api/user";
import HtmlEditor from "@/components/HtmlEditor.vue";

const loading = ref(false);
const hazards = ref<Hazard[]>([]);

const areaNameMap = ref<Record<number, string>>({});
const statusFilter = ref<HazardStatus | "">("");
const levelFilter = ref<HazardLevel | "">("");
const areaFilter = ref<number | "">("");
const keyword = ref("");
const taskFilter = ref<number | null>(null);
const dueRange = ref<[string, string] | null>(null);

const dialogVisible = ref(false);
const currentHazard = ref<Hazard | null>(null);

const editDialogVisible = ref(false);
const editSubmitting = ref(false);
const editFormRef = ref<FormInstance>();
const users = ref<AppUser[]>([]);

const editForm = reactive({
  id: 0,
  task_id: 0,
  task_item_record: null as number | null,
  task_item_record_images: [] as HazardTaskItemRecordImage[],
  rectification_images: [] as HazardRectificationImage[],
  title: "",
  description: "",
  status: "to_fix" as HazardStatus,
  area: 0,
  responsible: null as number | null,
  is_emergency: false,
  maintenance_type: "",
  cost: null as number | null,
  approver: null as number | null,
  approval_comment: "",
  equipment_name: "",
  equipment_code: "",
  due_date: "" as string | null,
  planned_date: "" as string | null
});

const transitionLoading = reactive<Record<number, boolean>>({});
const pagination = ref({ current: 1, pageSize: 10, total: 0 });

const statusOptions: Array<{ label: string; value: HazardStatus }> = [
  { label: "\u5f85\u6574\u6539", value: "to_fix" },
  { label: "\u6574\u6539\u4e2d", value: "fixing" },
  { label: "\u5f85\u590d\u67e5", value: "to_review" },
  { label: "\u5df2\u5173\u95ed", value: "closed" }
];

const levelOptions: Array<{ label: string; value: HazardLevel }> = [
  { label: "\u4e00\u822c", value: "minor" },
  { label: "\u91cd\u5927", value: "major" }
];

const dialogLabels = {
  title: "\u9690\u60a3\u8be6\u60c5",
  titleLabel: "\u6807\u9898",
  equipmentName: "\u8bbe\u5907\u540d\u79f0",
  equipmentCode: "\u8bbe\u5907\u7f16\u53f7",
  area: "\u533a\u57df",
  assignee: "\u6267\u884c\u4eba",
  images: "\u6574\u6539\u524d\u56fe\u7247",
  description: "\u63cf\u8ff0",
  isEmergency: "\u662f\u5426\u7d27\u6025",
  status: "\u72b6\u6001",
  dueDate: "\u6574\u6539\u671f\u9650",
  plannedDate: "\u8ba1\u5212\u65f6\u95f4",
  afterImages: "\u6574\u6539\u540e\u56fe\u7247",
  maintenanceType: "\u7ef4\u4fee/\u4fdd\u517b",
  cost: "\u8d39\u7528",
  approver: "\u5ba1\u6279\u4eba",
  approvalComment: "\u5ba1\u6279\u610f\u89c1"
};

const actionLabels = {
  action: "\u64cd\u4f5c",
  view: "\u67e5\u770b",
  edit: "\u7f16\u8f91",
  toReview: "\u8f6c\u5f85\u590d\u67e5",
  close: "\u5173\u95ed",
  closeConfirm: "\u786e\u8ba4\u5173\u95ed\u8be5\u9690\u60a3\u5417\uff1f",
  export: "\u5bfc\u51fa\u62a5\u544a"
};

const editLabels = {
  dialogTitle: "\u9690\u60a3\u7f16\u8f91",
  title: "\u6807\u9898",
  equipmentName: "\u8bbe\u5907\u540d\u79f0",
  equipmentCode: "\u8bbe\u5907\u7f16\u53f7",
  area: "\u533a\u57df",
  assignee: "\u6267\u884c\u4eba",
  images: "\u6574\u6539\u524d\u56fe\u7247",
  description: "\u63cf\u8ff0",
  isEmergency: "\u662f\u5426\u7d27\u6025",
  status: "\u72b6\u6001",
  dueDate: "\u6574\u6539\u671f\u9650",
  plannedDate: "\u8ba1\u5212\u65f6\u95f4",
  afterImages: "\u6574\u6539\u540e\u56fe\u7247",
  maintenanceType: "\u7ef4\u4fee/\u4fdd\u517b",
  cost: "\u8d39\u7528",
  approver: "\u5ba1\u6279\u4eba",
  approvalComment: "\u5ba1\u6279\u610f\u89c1",
  selectPlaceholder: "\u8bf7\u9009\u62e9",
  maintenancePlaceholder: "\u5982\uff1a\u7ef4\u4fee/\u4fdd\u517b",
  cancel: "\u53d6\u6d88",
  save: "\u4fdd\u5b58"
};

type UploadImageFile = UploadUserFile & { imageId?: number };

type UploadTaskImageFile = UploadUserFile & { imageId?: number };

const taskRecordFileList = ref<UploadTaskImageFile[]>([]);
const rectificationFileList = ref<UploadImageFile[]>([]);

function statusLabel(status: HazardStatus) {
  return statusOptions.find(x => x.value === status)?.label ?? status;
}

function statusTagType(status: HazardStatus) {
  if (status === "closed") return "success";
  if (status === "to_review") return "warning";
  if (status === "fixing") return "info";
  return "danger";
}

function emergencyLabel(value?: boolean) {
  return value ? "\u662f" : "\u5426";
}

const mediaBaseUrl = "http://localhost:8000";

function resolveImageUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${mediaBaseUrl}${value}`;
  return `${mediaBaseUrl}/${value}`;
}

function buildRectificationFileList(images: HazardRectificationImage[]) {
  return images.map(img => ({
    name: `image-${img.id}`,
    url: resolveImageUrl(img.image),
    status: "success",
    uid: `image-${img.id}`,
    imageId: img.id
  }));
}

function buildTaskRecordFileList(images: HazardTaskItemRecordImage[]) {
  return images.map(img => ({
    name: `image-${img.id}`,
    url: resolveImageUrl(img.image),
    status: "success",
    uid: `image-${img.id}`,
    imageId: img.id
  }));
}

function userDisplayName(user: AppUser) {
  return user.full_name?.trim() || "";
}

function userLabelById(id?: number | null) {
  if (!id) return "-";
  const found = users.value.find(user => user.id === id);
  if (!found) return `#${id}`;
  return userDisplayName(found);
}

function approverLabel(row: Hazard) {
  return (
    row.approver_full_name ?? row.approver_name ?? userLabelById(row.approver)
  );
}

function taskAssigneeLabel(row: Hazard) {
  return (
    row.responsible_full_name ??
    row.responsible_name ??
    (row.responsible ? `#${row.responsible}` : "-")
  );
}

function responsibleUsersLabel(row: Hazard) {
  const ids = row.responsible_users;
  if (!ids?.length) return "-";
  return ids.map(id => userLabelById(id)).join(", ");
}

function openDetail(row: Hazard) {
  currentHazard.value = row;
  dialogVisible.value = true;
}

function openEdit(row: Hazard) {
  editForm.id = row.id;
  editForm.task_id = row.task;
  editForm.task_item_record = row.task_item_record ?? null;
  editForm.task_item_record_images = row.task_item_record_images
    ? [...row.task_item_record_images]
    : [];
  editForm.rectification_images = row.rectification_images
    ? [...row.rectification_images]
    : [];
  taskRecordFileList.value = buildTaskRecordFileList(
    editForm.task_item_record_images
  );
  rectificationFileList.value = buildRectificationFileList(
    editForm.rectification_images
  );
  editForm.title = row.title ?? "";
  editForm.description = row.description ?? "";
  editForm.status = row.status;
  editForm.area = row.area;
  editForm.responsible = row.responsible ?? null;
  editForm.is_emergency = !!row.is_emergency;
  editForm.maintenance_type = row.maintenance_type ?? "";
  editForm.cost = row.cost ? Number(row.cost) : null;
  editForm.approver = row.approver ?? null;
  editForm.approval_comment = row.approval_comment ?? "";
  editForm.equipment_name = row.equipment_name ?? "";
  editForm.equipment_code = row.equipment_code ?? "";
  editForm.due_date = row.due_date ?? null;
  editForm.planned_date = row.planned_date ?? null;
  editDialogVisible.value = true;
}

function beforeUpload(file: File) {
  if (!file.type.startsWith("image/")) {
    message("\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6", {
      type: "warning"
    });
    return false;
  }
  return true;
}

async function handleTaskRecordUpload(options: UploadRequestOptions) {
  if (!editForm.task_item_record) {
    message(
      "\u65e0\u6cd5\u4e0a\u4f20\uff0c\u7f3a\u5c11\u68c0\u67e5\u9879\u8bb0\u5f55",
      {
        type: "warning"
      }
    );
    return;
  }
  const formData = new FormData();
  formData.append("task_item_record", String(editForm.task_item_record));
  formData.append("file", options.file);
  const pendingItem = taskRecordFileList.value.find(
    file => file.uid === options.file.uid
  ) as UploadTaskImageFile | undefined;
  if (pendingItem) {
    pendingItem.status = "uploading";
  }

  try {
    const image = await uploadTaskItemRecordImage(formData);
    editForm.task_item_record_images.push(image);
    const fileItem = taskRecordFileList.value.find(
      file => file.uid === options.file.uid
    ) as UploadTaskImageFile | undefined;
    const imageUrl = resolveImageUrl(image.image);
    if (fileItem) {
      fileItem.url = imageUrl;
      fileItem.name = fileItem.name || options.file.name;
      fileItem.status = "success";
      fileItem.imageId = image.id;
    } else {
      taskRecordFileList.value.push({
        name: options.file.name,
        url: imageUrl,
        status: "success",
        uid: options.file.uid,
        imageId: image.id
      });
    }
    options.onSuccess?.(image);
    message("\u4e0a\u4f20\u6210\u529f", { type: "success" });
  } catch (error) {
    if (pendingItem) {
      pendingItem.status = "fail";
    }
    options.onError?.(error as Error);
  }
}

async function handleTaskRecordRemove(file: UploadFile) {
  const target = file as UploadTaskImageFile;
  if (target.imageId) {
    try {
      await deleteTaskItemRecordImage(target.imageId);
      editForm.task_item_record_images =
        editForm.task_item_record_images.filter(
          img => img.id !== target.imageId
        );
    } catch (error) {
      const data = (error as any)?.response?.data;
      const detail = data?.detail || "\u5220\u9664\u5931\u8d25";
      message(detail, { type: "error" });
      return;
    }
  }
  taskRecordFileList.value = taskRecordFileList.value.filter(
    item => item.uid !== target.uid
  );
}

async function handleRectificationUpload(options: UploadRequestOptions) {
  if (!editForm.id) return;
  const formData = new FormData();
  formData.append("hazard", String(editForm.id));
  formData.append("file", options.file);
  const pendingItem = rectificationFileList.value.find(
    file => file.uid === options.file.uid
  ) as UploadImageFile | undefined;
  if (pendingItem) {
    pendingItem.status = "uploading";
  }

  try {
    const image = await uploadHazardRectificationImage(formData);
    editForm.rectification_images.push(image);
    const fileItem = rectificationFileList.value.find(
      file => file.uid === options.file.uid
    ) as UploadImageFile | undefined;
    const imageUrl = resolveImageUrl(image.image);
    if (fileItem) {
      fileItem.url = imageUrl;
      fileItem.name = fileItem.name || options.file.name;
      fileItem.status = "success";
      fileItem.imageId = image.id;
    } else {
      rectificationFileList.value.push({
        name: options.file.name,
        url: imageUrl,
        status: "success",
        uid: options.file.uid,
        imageId: image.id
      });
    }
    options.onSuccess?.(image);
    message("\u4e0a\u4f20\u6210\u529f", { type: "success" });
  } catch (error) {
    if (pendingItem) {
      pendingItem.status = "fail";
    }
    options.onError?.(error as Error);
  }
}

async function handleRectificationRemove(file: UploadFile) {
  const target = file as UploadImageFile;
  if (target.imageId) {
    await deleteHazardRectificationImage(target.imageId);
    editForm.rectification_images = editForm.rectification_images.filter(
      img => img.id !== target.imageId
    );
  }
  rectificationFileList.value = rectificationFileList.value.filter(
    item => item.uid !== target.uid
  );
}

async function handleUpdate() {
  if (!editForm.id) return;
  const title = editForm.title?.trim() || "";
  const description = editForm.description || "";
  const plainDescription = description
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  if (!title) {
    message("\u8bf7\u586b\u5199\u6807\u9898", { type: "warning" });
    return;
  }
  if (!plainDescription) {
    message("\u8bf7\u586b\u5199\u63cf\u8ff0", { type: "warning" });
    return;
  }
  if (!editForm.area) {
    message("\u8bf7\u9009\u62e9\u533a\u57df", { type: "warning" });
    return;
  }
  const normalizedCost =
    typeof editForm.cost === "number" && !Number.isNaN(editForm.cost)
      ? editForm.cost
      : null;
  editSubmitting.value = true;
  try {
    await updateHazard(editForm.id, {
      title,
      description,
      status: editForm.status,
      area: editForm.area,
      responsible: editForm.responsible,
      is_emergency: editForm.is_emergency,
      maintenance_type: editForm.maintenance_type || null,
      cost: normalizedCost,
      approver: editForm.approver || null,
      approval_comment: editForm.approval_comment || null,
      equipment_name: editForm.equipment_name || null,
      equipment_code: editForm.equipment_code || null,
      due_date: editForm.due_date || null
    });
    message("\u66f4\u65b0\u6210\u529f", { type: "success" });
    editDialogVisible.value = false;
    await fetchHazards();
  } catch (error) {
    const data = (error as any)?.response?.data;
    if (data && typeof data === "object") {
      const firstKey = Object.keys(data)[0];
      const detail =
        typeof data[firstKey] === "string"
          ? data[firstKey]
          : Array.isArray(data[firstKey])
            ? data[firstKey][0]
            : data.detail;
      message(detail || "\u66f4\u65b0\u5931\u8d25", { type: "error" });
    } else if (data) {
      message(String(data), { type: "error" });
    } else {
      message("\u66f4\u65b0\u5931\u8d25", { type: "error" });
    }
  } finally {
    editSubmitting.value = false;
  }
}

async function fetchAreas() {
  const list = await getAreas();
  areaNameMap.value = Object.fromEntries(list.map(x => [x.id, x.name]));
}

async function fetchUsers() {
  const list = await getUsers();
  users.value = list.filter(user => user.full_name?.trim());
}

async function fetchHazards() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize
    };
    if (statusFilter.value) params.status = statusFilter.value;
    if (levelFilter.value) params.level = levelFilter.value;
    if (areaFilter.value) params.area = areaFilter.value;
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    if (taskFilter.value) params.task = taskFilter.value;
    if (dueRange.value?.length === 2) {
      params.due_from = dueRange.value[0];
      params.due_to = dueRange.value[1];
    }
    const res = await getHazards(params);
    if (Array.isArray(res)) {
      hazards.value = res;
      pagination.value.total = res.length;
    } else {
      hazards.value = res.results;
      pagination.value.total = res.count;
    }
  } finally {
    loading.value = false;
  }
}

async function openHazardReport(hazardId: number) {
  try {
    const blob = await exportHazardReport(hazardId, "pdf");
    const url = window.URL.createObjectURL(blob);
    const previewWindow = window.open(url, "_blank");
    if (!previewWindow) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `hazard_report_${hazardId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  } catch {
    // ignore export errors
  }
}

async function handleExport(row: Hazard) {
  await openHazardReport(row.id);
}

async function handleTransition(row: Hazard, status: "to_review" | "closed") {
  transitionLoading[row.id] = true;
  try {
    await transitionHazardStatus(row.id, status);
    message("\u72b6\u6001\u66f4\u65b0\u6210\u529f", { type: "success" });
    await fetchHazards();
  } finally {
    transitionLoading[row.id] = false;
  }
}

onMounted(async () => {
  await fetchAreas();
  await fetchUsers();
  await fetchHazards();
});

watch([statusFilter, levelFilter, areaFilter], () => {
  pagination.value.current = 1;
  fetchHazards();
});

function handleSearch() {
  pagination.value.current = 1;
  fetchHazards();
}

function onPageSizeChange(size: number) {
  pagination.value.pageSize = size;
  pagination.value.current = 1;
  fetchHazards();
}

function onCurrentChange(current: number) {
  pagination.value.current = current;
  fetchHazards();
}

async function handlePrintDetail() {
  if (!currentHazard.value) return;
  await openHazardReport(currentHazard.value.id);
}
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="font-medium">隐患列表</span>
            <el-input
              v-model="keyword"
              placeholder="搜索标题/编号"
              clearable
              style="width: 200px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
            <el-input-number
              v-model="taskFilter"
              :min="1"
              placeholder="任务ID"
              controls-position="right"
              style="width: 140px"
            />
            <el-date-picker
              v-model="dueRange"
              type="daterange"
              start-placeholder="整改开始"
              end-placeholder="整改结束"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
            <el-select
              v-model="statusFilter"
              placeholder="状态"
              clearable
              style="width: 140px"
            >
              <el-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-select
              v-model="levelFilter"
              placeholder="等级"
              clearable
              style="width: 120px"
            >
              <el-option
                v-for="opt in levelOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-select
              v-model="areaFilter"
              placeholder="区域"
              clearable
              filterable
              style="width: 160px"
            >
              <el-option
                v-for="(name, id) in areaNameMap"
                :key="id"
                :label="name"
                :value="Number(id)"
              />
            </el-select>
          </div>
          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="handleSearch">查询</el-button>
            <el-button type="primary" :loading="loading" @click="fetchHazards">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="hazards" border :loading="loading" style="width: 100%">
        <el-table-column
          prop="title"
          label="标题"
          min-width="220"
          class-name="hazard-title-cell"
        />
        <el-table-column label="区域" min-width="120">
          <template #default="{ row }">
            {{ areaNameMap[row.area] ?? `#${row.area}` }}
          </template>
        </el-table-column>
        <el-table-column label="计划时间" min-width="120">
          <template #default="{ row }">
            {{
              row.planned_date
                ? dayjs(row.planned_date).format("YYYY-MM-DD")
                : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column label="整改期限" min-width="120">
          <template #default="{ row }">
            {{ row.due_date ? dayjs(row.due_date).format("YYYY-MM-DD") : "-" }}
          </template>
        </el-table-column>
        <el-table-column label="设备名称" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.equipment_name || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="设备编号" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.equipment_code || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="是否紧急" min-width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_emergency" type="danger">是</el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="执行人" min-width="120">
          <template #default="{ row }">
            {{ taskAssigneeLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column
          label="维修/保养"
          min-width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.maintenance_type || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="费用" min-width="80">
          <template #default="{ row }">
            {{ row.cost ?? "-" }}
          </template>
        </el-table-column>
        <el-table-column
          :label="actionLabels.action"
          min-width="180"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">
              {{ actionLabels.view }}
            </el-button>
            <el-button link type="primary" @click="openEdit(row)">
              {{ actionLabels.edit }}
            </el-button>
            <el-button
              v-if="row.status !== 'to_review' && row.status !== 'closed'"
              link
              type="warning"
              :loading="transitionLoading[row.id]"
              @click="handleTransition(row, 'to_review')"
            >
              {{ actionLabels.toReview }}
            </el-button>
            <el-button link type="primary" @click="handleExport(row)">
              {{ actionLabels.export }}
            </el-button>
            <el-popconfirm
              :title="actionLabels.closeConfirm"
              @confirm="handleTransition(row, 'closed')"
            >
              <template #reference>
                <el-button
                  v-if="row.status !== 'closed'"
                  link
                  type="danger"
                  :loading="transitionLoading[row.id]"
                >
                  {{ actionLabels.close }}
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:currentPage="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="onPageSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogLabels.title"
      width="820px"
    >
      <template v-if="currentHazard">
        <div class="hazard-detail-sheet">
          <div class="hazard-detail-title">机器设备故障隐患维修通知单</div>
          <table class="hazard-detail-table">
            <tbody>
              <tr>
                <th>设备名称</th>
                <td>{{ currentHazard.equipment_name ?? "-" }}</td>
                <th>设备编号</th>
                <td>{{ currentHazard.equipment_code ?? "-" }}</td>
              </tr>
              <tr>
                <th>报告人</th>
                <td>{{ taskAssigneeLabel(currentHazard) }}</td>
                <th>报告时间</th>
                <td>
                  {{
                    currentHazard.created_at
                      ? dayjs(currentHazard.created_at).format(
                          "YYYY-MM-DD HH:mm"
                        )
                      : "-"
                  }}
                </td>
              </tr>
              <tr>
                <th>执行人</th>
                <td>{{ responsibleUsersLabel(currentHazard) }}</td>
                <th>计划时间</th>
                <td>
                  {{
                    currentHazard.planned_date
                      ? dayjs(currentHazard.planned_date).format("YYYY-MM-DD")
                      : "-"
                  }}
                </td>
              </tr>
              <tr>
                <th>整改期限</th>
                <td colspan="3">
                  {{
                    currentHazard.due_date
                      ? dayjs(currentHazard.due_date).format("YYYY-MM-DD")
                      : "-"
                  }}
                </td>
              </tr>
              <tr class="hazard-detail-row--photo">
                <th>整改前照片</th>
                <td colspan="3">
                  <div
                    v-if="
                      currentHazard.task_item_record_images &&
                      currentHazard.task_item_record_images.length
                    "
                    class="task-upload-cell"
                  >
                    <div
                      v-for="img in currentHazard.task_item_record_images"
                      :key="img.id"
                      class="task-upload-item"
                    >
                      <el-popover
                        placement="right"
                        trigger="hover"
                        :width="260"
                      >
                        <template #reference>
                          <a
                            class="task-upload-thumb-link"
                            :href="resolveImageUrl(img.image)"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              class="task-upload-thumb"
                              :src="resolveImageUrl(img.image)"
                            />
                          </a>
                        </template>
                        <el-image
                          :src="resolveImageUrl(img.image)"
                          fit="contain"
                          style="width: 240px; height: auto"
                        />
                      </el-popover>
                    </div>
                  </div>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr class="hazard-detail-row--title">
                <th>标题</th>
                <td colspan="3">{{ currentHazard.title || "-" }}</td>
              </tr>
              <tr class="hazard-detail-row--desc">
                <th>描述</th>
                <td colspan="3">
                  <div v-html="currentHazard.description || '-'" />
                </td>
              </tr>
              <tr>
                <th>维修/保养</th>
                <td>{{ currentHazard.maintenance_type ?? "-" }}</td>
                <th>费用</th>
                <td>{{ currentHazard.cost ?? "-" }}</td>
              </tr>
              <tr>
                <th>审批人</th>
                <td>{{ approverLabel(currentHazard) }}</td>
                <th>审批意见</th>
                <td>{{ currentHazard.approval_comment ?? "-" }}</td>
              </tr>
              <tr>
                <th>验收日期</th>
                <td colspan="3">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <el-button type="primary" @click="handlePrintDetail">
            打印
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" width="1200px">
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span>{{ editLabels.dialogTitle }}</span>
          <span class="text-xs text-gray-500">
            （生成自任务ID：{{ editForm.task_id || "-" }}）
          </span>
        </div>
      </template>
      <el-form ref="editFormRef" :model="editForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="editLabels.title">
              <el-input v-model="editForm.title" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.equipmentName">
              <el-input v-model="editForm.equipment_name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.equipmentCode">
              <el-input v-model="editForm.equipment_code" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.area">
              <el-select
                v-model="editForm.area"
                :placeholder="editLabels.selectPlaceholder"
                filterable
              >
                <el-option
                  v-for="(name, id) in areaNameMap"
                  :key="id"
                  :label="name"
                  :value="Number(id)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.assignee">
              <el-select
                v-model="editForm.responsible"
                :placeholder="editLabels.selectPlaceholder"
                clearable
                filterable
              >
                <el-option
                  v-for="u in users"
                  :key="u.id"
                  :label="userDisplayName(u)"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.plannedDate">
              <el-date-picker
                v-model="editForm.planned_date"
                type="date"
                value-format="YYYY-MM-DD"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="editLabels.images">
              <div class="task-upload-cell">
                <div
                  v-for="file in taskRecordFileList"
                  :key="file.uid"
                  class="task-upload-item"
                >
                  <el-popover
                    v-if="file.url"
                    placement="right"
                    trigger="hover"
                    :width="260"
                  >
                    <template #reference>
                      <a
                        class="task-upload-thumb-link"
                        :href="file.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img class="task-upload-thumb" :src="file.url" />
                      </a>
                    </template>
                    <el-image
                      :src="file.url"
                      fit="contain"
                      style="width: 240px; height: auto"
                    />
                  </el-popover>
                  <div
                    v-else
                    class="task-upload-thumb task-upload-thumb--placeholder"
                  >
                    无
                  </div>
                  <button
                    type="button"
                    class="task-upload-remove"
                    @click="handleTaskRecordRemove(file)"
                  >
                    &times;
                  </button>
                </div>
                <el-upload
                  v-model:file-list="taskRecordFileList"
                  class="task-upload-uploader"
                  :show-file-list="false"
                  multiple
                  accept="image/*"
                  :auto-upload="true"
                  :before-upload="beforeUpload"
                  :http-request="handleTaskRecordUpload"
                >
                  <div class="task-upload-add">+</div>
                </el-upload>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="editLabels.description">
              <HtmlEditor v-model="editForm.description" height="180px" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.isEmergency">
              <el-switch v-model="editForm.is_emergency" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.status">
              <el-select
                v-model="editForm.status"
                :placeholder="editLabels.selectPlaceholder"
              >
                <el-option
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.dueDate">
              <el-date-picker
                v-model="editForm.due_date"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="editLabels.afterImages">
              <div class="task-upload-cell">
                <div
                  v-for="file in rectificationFileList"
                  :key="file.uid"
                  class="task-upload-item"
                >
                  <el-popover
                    v-if="file.url"
                    placement="right"
                    trigger="hover"
                    :width="260"
                  >
                    <template #reference>
                      <a
                        class="task-upload-thumb-link"
                        :href="file.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img class="task-upload-thumb" :src="file.url" />
                      </a>
                    </template>
                    <el-image
                      :src="file.url"
                      fit="contain"
                      style="width: 240px; height: auto"
                    />
                  </el-popover>
                  <div
                    v-else
                    class="task-upload-thumb task-upload-thumb--placeholder"
                  >
                    无
                  </div>
                  <button
                    type="button"
                    class="task-upload-remove"
                    @click="handleRectificationRemove(file)"
                  >
                    &times;
                  </button>
                </div>
                <el-upload
                  v-model:file-list="rectificationFileList"
                  class="task-upload-uploader"
                  :show-file-list="false"
                  multiple
                  accept="image/*"
                  :auto-upload="true"
                  :before-upload="beforeUpload"
                  :http-request="handleRectificationUpload"
                >
                  <div class="task-upload-add">+</div>
                </el-upload>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.maintenanceType">
              <el-input
                v-model="editForm.maintenance_type"
                :placeholder="editLabels.maintenancePlaceholder"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.cost">
              <el-input-number
                v-model="editForm.cost"
                :min="0"
                :step="1"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editLabels.approver">
              <el-select
                v-model="editForm.approver"
                :placeholder="editLabels.selectPlaceholder"
                clearable
                filterable
              >
                <el-option
                  v-for="u in users"
                  :key="u.id"
                  :label="userDisplayName(u)"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="editLabels.approvalComment">
              <el-input
                v-model="editForm.approval_comment"
                type="textarea"
                :rows="3"
                placeholder="请输入审批意见"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="editDialogVisible = false">{{
            editLabels.cancel
          }}</el-button>
          <el-button
            type="primary"
            :loading="editSubmitting"
            @click="handleUpdate"
          >
            {{ editLabels.save }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>

  <div class="hazard-print">
    <div v-if="currentHazard" class="hazard-print__page">
      <div class="hazard-print__title">{{ currentHazard.title || "-" }}</div>
      <div class="hazard-print__meta">
        <div class="hazard-print__row">
          <div class="hazard-print__label">设备名称</div>
          <div class="hazard-print__value">
            {{ currentHazard.equipment_name ?? "-" }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">设备编号</div>
          <div class="hazard-print__value">
            {{ currentHazard.equipment_code ?? "-" }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">区域</div>
          <div class="hazard-print__value">
            {{ areaNameMap[currentHazard.area] ?? `#${currentHazard.area}` }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">负责人</div>
          <div class="hazard-print__value">
            {{ taskAssigneeLabel(currentHazard) }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">计划时间</div>
          <div class="hazard-print__value">
            {{
              currentHazard.planned_date
                ? dayjs(currentHazard.planned_date).format("YYYY-MM-DD")
                : "-"
            }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">整改期限</div>
          <div class="hazard-print__value">
            {{
              currentHazard.due_date
                ? dayjs(currentHazard.due_date).format("YYYY-MM-DD")
                : "-"
            }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">是否紧急</div>
          <div class="hazard-print__value">
            {{ emergencyLabel(currentHazard.is_emergency) }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">状态</div>
          <div class="hazard-print__value">
            {{ statusLabel(currentHazard.status) }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">维修/保养</div>
          <div class="hazard-print__value">
            {{ currentHazard.maintenance_type ?? "-" }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">费用</div>
          <div class="hazard-print__value">
            {{ currentHazard.cost ?? "-" }}
          </div>
        </div>
        <div class="hazard-print__row">
          <div class="hazard-print__label">审批人</div>
          <div class="hazard-print__value">
            {{ approverLabel(currentHazard) }}
          </div>
        </div>
        <div class="hazard-print__row hazard-print__row--full">
          <div class="hazard-print__label">审批意见</div>
          <div class="hazard-print__value">
            {{ currentHazard.approval_comment || "-" }}
          </div>
        </div>
        <div class="hazard-print__row hazard-print__row--full">
          <div class="hazard-print__label">描述</div>
          <div class="hazard-print__value">
            <div v-html="currentHazard.description || '-'" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-upload-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.task-upload-item {
  position: relative;
  width: 56px;
  height: 56px;
}

.task-upload-thumb {
  display: block;
  width: 56px;
  height: 56px;
  object-fit: cover;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.task-upload-thumb--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
}

.task-upload-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  padding: 0;
  font-size: 14px;
  line-height: 18px;
  color: #fff;
  cursor: pointer;
  background: var(--el-color-danger);
  border: none;
  border-radius: 50%;
}

.task-upload-uploader {
  width: 56px;
  height: 56px;
}

.task-upload-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  font-size: 24px;
  color: var(--el-text-color-secondary);
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
}

.task-upload-thumb-link {
  display: block;
}

.hazard-title-cell .cell {
  word-break: break-all;
  white-space: normal;
}

.hazard-print {
  display: none;
}

.hazard-print__page {
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 14mm;
  font-size: 12px;
  color: #111;
}

.hazard-print__title {
  margin-bottom: 12mm;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.hazard-print__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6mm 10mm;
}

.hazard-print__row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 6px;
  align-items: start;
}

.hazard-print__row--full {
  grid-column: span 2;
}

.hazard-print__label {
  font-weight: 600;
}

.hazard-print__value :deep(p) {
  margin: 0 0 4px;
}

.hazard-detail-sheet {
  padding: 8px 4px 4px;
}

.hazard-detail-title {
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.hazard-detail-table {
  width: 100%;
  font-size: 15px;
  border-collapse: collapse;
}

.hazard-detail-table th,
.hazard-detail-table td {
  padding: 10px 12px;
  font-weight: 600;
  vertical-align: top;
  border: 1px solid var(--el-border-color);
}

.hazard-detail-table th {
  width: 110px;
  text-align: center;
  background: var(--el-fill-color-lighter);
}

.hazard-detail-row--photo td {
  min-height: 220px;
}

.hazard-detail-row--title td {
  min-height: 140px;
}

.hazard-detail-row--desc td {
  min-height: 90px;
}

@media print {
  @page {
    size: a4 portrait;
    margin: 12mm 14mm;
  }

  body * {
    visibility: hidden;
  }

  .hazard-print,
  .hazard-print * {
    visibility: visible;
  }

  .hazard-print {
    position: fixed;
    top: 0;
    left: 0;
    display: block;
    background: #fff;
  }
}
</style>
