<script setup lang="ts">
/**
 * 全部任务页面
 * - 用于查看全量任务（管理员传 all=true 才能看到全部；非管理员仍只会返回自己的任务）
 * - 提供筛选与跳转“新建临时任务”
 */
import { computed, onMounted, ref } from "vue";
import dayjs from "dayjs";
import { useRouter } from "vue-router";
import {
  getTasks,
  type Task,
  type TaskStatus,
  type TaskType
} from "@/api/tasks";
import { getAreas } from "@/api/config";

const router = useRouter();

const loading = ref(false);
const tasks = ref<Task[]>([]);
const areaNameMap = ref<Record<number, string>>({});
const pagination = ref({ current: 1, pageSize: 10, total: 0 });

const statusFilter = ref<TaskStatus | "">("");
const typeFilter = ref<TaskType | "">("");
const emergencyFilter = ref<"" | "true" | "false">("");

const statusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: "待执行", value: "pending" },
  { label: "进行中", value: "in_progress" },
  { label: "已完成", value: "completed" },
  { label: "复查中", value: "under_review" },
  { label: "已关闭", value: "closed" }
];

const typeOptions: Array<{ label: string; value: TaskType }> = [
  { label: "计划", value: "scheduled" },
  { label: "临时", value: "adhoc" }
];

const emergencyOptions = [
  { label: "紧急", value: "true" },
  { label: "非紧急", value: "false" }
];

const filters = computed(() => ({
  status: statusFilter.value,
  task_type: typeFilter.value,
  is_emergency: emergencyFilter.value
}));

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
    const params: any = {
      all: true,
      page: pagination.value.current,
      page_size: pagination.value.pageSize
    };
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.task_type) params.task_type = filters.value.task_type;
    if (filters.value.is_emergency)
      params.is_emergency = filters.value.is_emergency === "true";
    const res = await getTasks(params);
    if (Array.isArray(res)) {
      tasks.value = res;
      pagination.value.total = res.length;
    } else {
      tasks.value = res.results;
      pagination.value.total = res.count;
    }
  } finally {
    loading.value = false;
  }
}

function handleFilterChange() {
  pagination.value.current = 1;
  fetchTasks();
}

function onPageSizeChange(size: number) {
  pagination.value.pageSize = size;
  pagination.value.current = 1;
  fetchTasks();
}

function onCurrentChange(current: number) {
  pagination.value.current = current;
  fetchTasks();
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
            <span class="font-medium">全部任务</span>
            <el-select
              v-model="statusFilter"
              placeholder="状态"
              clearable
              style="width: 140px"
              @change="handleFilterChange"
              @clear="handleFilterChange"
            >
              <el-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-select
              v-model="typeFilter"
              placeholder="类型"
              clearable
              style="width: 120px"
              @change="handleFilterChange"
              @clear="handleFilterChange"
            >
              <el-option
                v-for="opt in typeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-select
              v-model="emergencyFilter"
              placeholder="紧急"
              clearable
              style="width: 120px"
              @change="handleFilterChange"
              @clear="handleFilterChange"
            >
              <el-option
                v-for="opt in emergencyOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="fetchTasks">刷新</el-button>
            <el-button
              type="primary"
              @click="router.push('/tasks/create-adhoc')"
            >
              新建临时任务
            </el-button>
          </div>
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
  </div>
</template>
