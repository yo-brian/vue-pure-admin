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
import { deleteTask, getTasks, type Task, type TaskStatus } from "@/api/tasks";
import { getAreas } from "@/api/config";
import { getToken } from "@/utils/auth";
import { getJwtUserId } from "@/utils/jwt";
import { message } from "@/utils/message";

const router = useRouter();

const loading = ref(false);
const tasks = ref<Task[]>([]);
const deletingId = ref<number | null>(null);
const pagination = ref({ current: 1, pageSize: 10, total: 0 });

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

function goEdit(row: Task) {
  router.push(`/tasks/edit/${row.id}`);
}

async function handleDelete(row: Task) {
  deletingId.value = row.id;
  try {
    await deleteTask(row.id);
    message("删除成功", { type: "success" });
    await fetchTasks();
  } finally {
    deletingId.value = null;
  }
}

async function fetchAreas() {
  const list = await getAreas();
  areaNameMap.value = Object.fromEntries(list.map(x => [x.id, x.name]));
}

async function fetchTasks() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize
    };
    // 需求中要求按 assignee 请求；如果解析不到 user_id，就不传（后端默认也会过滤当前用户）
    if (currentUserId.value) params.assignee = currentUserId.value;
    if (statusFilter.value) params.status = statusFilter.value;
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
            <span class="font-medium">我的任务</span>
            <el-select
              v-model="statusFilter"
              placeholder="按状态筛选"
              clearable
              style="width: 180px"
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
          </div>
          <div class="flex items-center gap-2">
            <el-button type="primary" :loading="loading" @click="fetchTasks">
              刷新
            </el-button>
            <el-button
              type="success"
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
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">
              详情
            </el-button>
            <el-button link type="primary" @click="goEdit(row)">
              编辑
            </el-button>
            <el-popconfirm
              title="确认删除该任务吗？"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button link type="danger" :loading="deletingId === row.id">
                  删除
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
  </div>
</template>
