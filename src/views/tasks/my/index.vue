<script setup lang="ts">
/**
 * 我的任务页面
 * - 展示当前登录用户的任务列表
 * - 支持按状态筛选
 * - 点击“详情”跳转任务详情页
 */
import { computed, onMounted, ref } from "vue";
import dayjs from "dayjs";
import { useRouter } from "vue-router";
import { getTasks, type Task, type TaskStatus } from "@/api/tasks";
import { getAreas } from "@/api/config";
import { getToken } from "@/utils/auth";
import { getJwtUserId } from "@/utils/jwt";

const router = useRouter();

const loading = ref(false);
const tasks = ref<Task[]>([]);

// 区域 id -> 名称，用于表格展示
const areaNameMap = ref<Record<number, string>>({});

// 状态筛选：为空表示不过滤
const statusFilter = ref<TaskStatus | "">("");

const statusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: "待执行", value: "pending" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "completed" },
  { label: "复查中", value: "under_review" },
  { label: "已关闭", value: "closed" }
];

const currentUserId = computed(() => {
  const token = getToken();
  return getJwtUserId(token?.accessToken);
});

function taskTypeLabel(taskType: Task["task_type"]) {
  return taskType === "scheduled" ? "计划" : "临时";
}

function statusLabel(status: TaskStatus) {
  return statusOptions.find(x => x.value === status)?.label ?? status;
}

function statusTagType(status: TaskStatus) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "pending") return "info";
  if (status === "closed") return "default";
  return "warning";
}

function goDetail(row: Task) {
  router.push(`/tasks/detail/${row.id}`);
}

async function fetchAreas() {
  const list = await getAreas();
  areaNameMap.value = Object.fromEntries(list.map(x => [x.id, x.name]));
}

async function fetchTasks() {
  loading.value = true;
  try {
    const params: any = {};
    // 需求中要求按 assignee 请求；如果解析不到 user_id，就不传（后端默认也会过滤当前用户）
    if (currentUserId.value) params.assignee = currentUserId.value;
    if (statusFilter.value) params.status = statusFilter.value;
    tasks.value = await getTasks(params);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchAreas();
  await fetchTasks();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="font-medium">我的任务</span>
            <el-select
              v-model="statusFilter"
              placeholder="按状态筛选"
              clearable
              style="width: 180px"
              @change="fetchTasks"
              @clear="fetchTasks"
            >
              <el-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
          <el-button type="primary" :loading="loading" @click="fetchTasks">
            刷新
          </el-button>
        </div>
      </template>

      <el-table :data="tasks" border :loading="loading" style="width: 100%">
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column label="区域名称" min-width="140">
          <template #default="{ row }">
            {{ areaNameMap[row.area] ?? `#${row.area}` }}
          </template>
        </el-table-column>
        <el-table-column label="任务类型" width="100">
          <template #default="{ row }">
            <el-tag type="info">{{ taskTypeLabel(row.task_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="紧急" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_emergency" type="danger">是</el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{
              statusLabel(row.status)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="120">
          <template #default="{ row }">
            {{ dayjs(row.due_date).format("YYYY-MM-DD") }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
