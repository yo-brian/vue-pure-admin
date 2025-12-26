<script setup lang="ts">
/**
 * 任务详情页面
 * - 展示任务基础信息与检查项列表
 * - 支持录入每条检查项的结果与备注，并提交到后端
 */
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import {
  getTaskDetail,
  submitTaskResults,
  type TaskDetail,
  type TaskItemRecordResult
} from "@/api/tasks";
import { getAreas, getCheckItems } from "@/api/config";

const route = useRoute();
const router = useRouter();

const taskId = computed(() => Number(route.params.id));

const loading = ref(false);
const submitting = ref(false);

const taskDetail = ref<TaskDetail | null>(null);
const descriptionLabel = "\u63cf\u8ff0";

const descriptionHtml = computed(() => {
  const value = taskDetail.value?.description ?? "";
  return value.trim() ? value : "-";
});

// 区域、检查项映射（后端当前返回的是 id，前端做一次映射即可）
const areaNameMap = ref<Record<number, string>>({});
const checkItemNameMap = ref<Record<number, string>>({});

type EditableRecord = {
  id: number;
  name: string;
  result: TaskItemRecordResult | "";
  comment: string;
};

const editableRecords = ref<EditableRecord[]>([]);

const resultOptions: Array<{ label: string; value: TaskItemRecordResult }> = [
  { label: "正常", value: "normal" },
  { label: "异常", value: "abnormal" },
  { label: "不适用", value: "not_applicable" }
];

function taskTypeLabel(taskType: TaskDetail["task_type"]) {
  return taskType === "scheduled" ? "计划任务" : "临时任务";
}

function statusLabel(status: TaskDetail["status"]) {
  const map: Record<string, string> = {
    pending: "待执行",
    in_progress: "进行中",
    completed: "已完成",
    under_review: "复查中",
    closed: "已关闭"
  };
  return map[status] ?? status;
}

function buildEditableRecords(detail: TaskDetail) {
  editableRecords.value = detail.item_records.map(r => {
    const name =
      r.custom_name ||
      (r.check_item ? checkItemNameMap.value[r.check_item] : "") ||
      `检查项#${r.id}`;
    return {
      id: r.id,
      name,
      result: (r.result ?? "") as TaskItemRecordResult | "",
      comment: r.comment ?? ""
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
  if (!editableRecords.value.length) {
    message("暂无检查项可提交", { type: "warning" });
    return;
  }
  const missing = editableRecords.value.find(r => !r.result);
  if (missing) {
    message("请先为所有检查项选择结果", { type: "warning" });
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
    message("提交成功", { type: "success" });
    router.push("/tasks/my");
  } finally {
    submitting.value = false;
  }
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
          <span class="font-medium">任务详情</span>
          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="fetchDetail">刷新</el-button>
            <el-button @click="router.push('/tasks/my')">返回</el-button>
          </div>
        </div>
      </template>

      <el-descriptions v-if="taskDetail" :column="2" border class="mb-4">
        <el-descriptions-item label="标题">
          {{ taskDetail.title }}
        </el-descriptions-item>
        <el-descriptions-item label="区域">
          {{ areaNameMap[taskDetail.area] ?? `#${taskDetail.area}` }}
        </el-descriptions-item>
        <el-descriptions-item label="任务类型">
          {{ taskTypeLabel(taskDetail.task_type) }}
        </el-descriptions-item>
        <el-descriptions-item label="紧急">
          <el-tag v-if="taskDetail.is_emergency" type="danger">是</el-tag>
          <span v-else>否</span>
        </el-descriptions-item>
        <el-descriptions-item label="截止日期">
          {{ dayjs(taskDetail.due_date).format("YYYY-MM-DD") }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ statusLabel(taskDetail.status) }}
        </el-descriptions-item>
        <el-descriptions-item :label="descriptionLabel" :span="2">
          <div v-html="descriptionHtml" />
        </el-descriptions-item>

        <el-descriptions-item label="设备名称">
          {{ taskDetail.equipment_name || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="设备编号">
          {{ taskDetail.equipment_code || "-" }}
        </el-descriptions-item>
      </el-descriptions>

      <el-table
        :data="editableRecords"
        border
        style="width: 100%"
        empty-text="暂无检查项"
      >
        <el-table-column prop="name" label="检查项名称" min-width="200" />
        <el-table-column label="结果" width="160">
          <template #default="{ row }">
            <el-select v-model="row.result" placeholder="请选择" clearable>
              <el-option
                v-for="opt in resultOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.comment"
              placeholder="可填写备注"
              clearable
            />
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          提交检查结果
        </el-button>
      </div>
    </el-card>
  </div>
</template>
