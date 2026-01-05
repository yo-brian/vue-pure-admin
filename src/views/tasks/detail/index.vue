<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import dayjs from "dayjs";
import type {
  UploadFile,
  UploadRequestOptions,
  UploadUserFile
} from "element-plus";
import { message } from "@/utils/message";
import {
  getTaskDetail,
  submitTaskResults,
  uploadTaskItemRecordImage,
  deleteTaskItemRecordImage,
  type TaskDetail,
  type TaskItemRecordImage,
  type TaskItemRecordResult
} from "@/api/tasks";
import { getAreas, getCheckItems } from "@/api/config";

const route = useRoute();
const router = useRouter();

const taskId = computed(() => Number(route.params.id));

const loading = ref(false);
const submitting = ref(false);

const taskDetail = ref<TaskDetail | null>(null);
const isCompleted = computed(() => taskDetail.value?.status === "completed");

const descriptionHtml = computed(() => {
  const value = taskDetail.value?.description ?? "";
  return value.trim() ? value : "-";
});

const areaNameMap = ref<Record<number, string>>({});
const checkItemNameMap = ref<Record<number, string>>({});

type UploadImageFile = UploadUserFile & { imageId?: number };

type EditableRecord = {
  id: number;
  name: string;
  result: TaskItemRecordResult | "";
  comment: string;
  isCustom: boolean;
  images: TaskItemRecordImage[];
  fileList: UploadImageFile[];
};

const editableRecords = ref<EditableRecord[]>([]);

const resultOptions: Array<{ label: string; value: TaskItemRecordResult }> = [
  { label: "\u6b63\u5e38", value: "normal" },
  { label: "\u5f02\u5e38", value: "abnormal" },
  { label: "\u4e0d\u9002\u7528", value: "not_applicable" }
];

function taskTypeLabel(taskType: TaskDetail["task_type"]) {
  return taskType === "scheduled"
    ? "\u5b9a\u671f\u4efb\u52a1"
    : "\u4e34\u65f6\u4efb\u52a1";
}

function statusLabel(status: TaskDetail["status"]) {
  const map: Record<string, string> = {
    pending: "\u5f85\u5904\u7406",
    in_progress: "\u8fdb\u884c\u4e2d",
    completed: "\u5df2\u5b8c\u6210",
    under_review: "\u5f85\u5ba1\u6838",
    closed: "\u5df2\u5173\u95ed"
  };
  return map[status] ?? status;
}

const mediaBaseUrl = "http://localhost:8000";

function resolveImageUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${mediaBaseUrl}${value}`;
  return `${mediaBaseUrl}/${value}`;
}

function buildImageFileList(images: TaskItemRecordImage[]) {
  return images.map(img => ({
    name: `image-${img.id}`,
    url: resolveImageUrl(img.image),
    status: "success",
    uid: `image-${img.id}`,
    imageId: img.id
  }));
}

function buildEditableRecords(detail: TaskDetail) {
  editableRecords.value = detail.item_records.map(r => {
    const name =
      r.custom_name ||
      (r.check_item ? checkItemNameMap.value[r.check_item] : "") ||
      `\u68c0\u67e5\u9879#${r.id}`;
    const images = r.images ?? [];
    return {
      id: r.id,
      name,
      result: (r.result ?? "") as TaskItemRecordResult | "",
      comment: r.comment ?? "",
      isCustom: !!r.custom_name,
      images,
      fileList: buildImageFileList(images)
    };
  });
}

async function fetchMaps() {
  const [areas, items] = await Promise.all([getAreas(), getCheckItems()]);
  areaNameMap.value = Object.fromEntries(areas.map(x => [x.id, x.name]));
  checkItemNameMap.value = Object.fromEntries(items.map(x => [x.id, x.name]));
}

async function fetchDetail() {
  loading.value = true;
  try {
    const detail = await getTaskDetail(taskId.value);
    taskDetail.value = detail;
    buildEditableRecords(detail);
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (!taskDetail.value) return;
  if (isCompleted.value) {
    message(
      "\u4efb\u52a1\u5df2\u5b8c\u6210\uff0c\u4e0d\u80fd\u518d\u4fee\u6539",
      { type: "warning" }
    );
    return;
  }
  if (!editableRecords.value.length) {
    message("\u6ca1\u6709\u53ef\u63d0\u4ea4\u7684\u68c0\u67e5\u9879", {
      type: "warning"
    });
    return;
  }
  const missing = editableRecords.value.find(r => !r.result);
  if (missing) {
    message(
      "\u8bf7\u5148\u9009\u62e9\u6240\u6709\u68c0\u67e5\u9879\u7684\u7ed3\u679c",
      { type: "warning" }
    );
    return;
  }
  const uploading = editableRecords.value.some(r =>
    r.fileList.some(file => file.status === "uploading")
  );
  if (uploading) {
    message(
      "\u6709\u56fe\u7247\u6b63\u5728\u4e0a\u4f20\uff0c\u8bf7\u7a0d\u540e\u518d\u63d0\u4ea4",
      { type: "warning" }
    );
    return;
  }
  const missingImages = editableRecords.value.find(
    r => r.isCustom && r.result === "abnormal" && r.images.length === 0
  );
  if (missingImages) {
    message(
      "\u81ea\u5b9a\u4e49\u68c0\u67e5\u9879\u5f02\u5e38\u5fc5\u987b\u4e0a\u4f20\u6574\u6539\u524d\u56fe\u7247",
      {
        type: "warning"
      }
    );
    return;
  }

  submitting.value = true;
  try {
    await submitTaskResults(taskId.value, {
      records: editableRecords.value.map(r => ({
        task_item_record_id: r.id,
        result: r.result as TaskItemRecordResult,
        comment: r.comment
      }))
    });
    message("\u63d0\u4ea4\u6210\u529f", { type: "success" });
    router.push("/tasks/my");
  } finally {
    submitting.value = false;
  }
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

async function handleUpload(
  options: UploadRequestOptions,
  row: EditableRecord
) {
  if (isCompleted.value) {
    options.onError?.(
      new Error(
        "\u4efb\u52a1\u5df2\u5b8c\u6210\uff0c\u4e0d\u80fd\u4e0a\u4f20\u56fe\u7247"
      )
    );
    return;
  }
  const formData = new FormData();
  formData.append("task_item_record", String(row.id));
  formData.append("file", options.file);
  const pendingItem = row.fileList.find(
    file => file.uid === options.file.uid
  ) as UploadImageFile | undefined;
  if (pendingItem) {
    pendingItem.status = "uploading";
  }

  try {
    const image = await uploadTaskItemRecordImage(formData);
    row.images.push(image);
    const fileItem = row.fileList.find(
      file => file.uid === options.file.uid
    ) as UploadImageFile | undefined;
    const imageUrl = resolveImageUrl(image.image);
    if (fileItem) {
      fileItem.url = imageUrl;
      fileItem.name = fileItem.name || options.file.name;
      fileItem.status = "success";
      fileItem.imageId = image.id;
    } else {
      row.fileList.push({
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

async function handleRemove(file: UploadFile, row: EditableRecord) {
  if (isCompleted.value) return;
  const target = file as UploadImageFile;
  if (target.imageId) {
    await deleteTaskItemRecordImage(target.imageId);
    row.images = row.images.filter(img => img.id !== target.imageId);
  }
  row.fileList = row.fileList.filter(item => item.uid !== target.uid);
}

onMounted(async () => {
  await fetchMaps();
  await fetchDetail();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" :loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">&#20219;&#21153;&#35814;&#24773;</span>
          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="fetchDetail"
              >&#21047;&#26032;</el-button
            >
            <el-button @click="router.push('/tasks/my')"
              >&#36820;&#22238;</el-button
            >
          </div>
        </div>
      </template>

      <el-form v-if="taskDetail" label-width="110px" class="mb-4">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="标题">
              <el-input :model-value="taskDetail.title" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称">
              <el-input
                :model-value="taskDetail.equipment_name || '-'"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备编号">
              <el-input
                :model-value="taskDetail.equipment_code || '-'"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务类型">
              <el-input
                :model-value="taskTypeLabel(taskDetail.task_type)"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区域">
              <el-input
                :model-value="
                  areaNameMap[taskDetail.area] ?? `#${taskDetail.area}`
                "
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否紧急">
              <el-input
                :model-value="taskDetail.is_emergency ? '是' : '否'"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="执行人">
              <el-input
                :model-value="taskDetail.assignee_name?.trim() || '-'"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期">
              <el-input
                :model-value="dayjs(taskDetail.due_date).format('YYYY-MM-DD')"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划日期">
              <el-input
                :model-value="
                  taskDetail.planned_date
                    ? dayjs(taskDetail.planned_date).format('YYYY-MM-DD')
                    : '-'
                "
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="可选模板">
              <el-input
                :model-value="
                  taskDetail.template ? `#${taskDetail.template}` : '-'
                "
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="自定义检查项">
              <el-input
                :model-value="
                  taskDetail.custom_check_items?.length
                    ? taskDetail.custom_check_items.join('、')
                    : '-'
                "
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述">
              <div class="task-desc-html" v-html="descriptionHtml" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-table
        :data="editableRecords"
        border
        style="width: 100%"
        empty-text="&#26242;&#26080;&#26816;&#26597;&#39033;"
      >
        <el-table-column
          prop="name"
          label="&#26816;&#26597;&#39033;"
          min-width="200"
        />
        <el-table-column label="&#32467;&#26524;" width="160">
          <template #default="{ row }">
            <el-select
              v-model="row.result"
              placeholder="&#36873;&#25321;"
              clearable
              :disabled="isCompleted"
            >
              <el-option
                v-for="opt in resultOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="&#22791;&#27880;" min-width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.comment"
              placeholder="&#35831;&#36755;&#20837;&#22791;&#27880;"
              clearable
              :disabled="isCompleted"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="&#25972;&#25913;&#21069;&#22270;&#29255;"
          min-width="240"
        >
          <template #default="{ row }">
            <div v-if="row.isCustom">
              <div class="task-upload-cell">
                <div
                  v-for="file in row.fileList"
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
                    &#26080;
                  </div>
                  <button
                    v-if="!isCompleted"
                    type="button"
                    class="task-upload-remove"
                    @click="handleRemove(file, row)"
                  >
                    &times;
                  </button>
                </div>
                <el-upload
                  v-if="!isCompleted"
                  v-model:file-list="row.fileList"
                  class="task-upload-uploader"
                  :show-file-list="false"
                  multiple
                  accept="image/*"
                  :auto-upload="true"
                  :before-upload="beforeUpload"
                  :http-request="options => handleUpload(options, row)"
                >
                  <div class="task-upload-add">+</div>
                </el-upload>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="isCompleted"
          @click="handleSubmit"
        >
          &#25552;&#20132;&#26816;&#26597;&#32467;&#26524;
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.task-desc-html {
  padding: 6px 0;
}

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
</style>
