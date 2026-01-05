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
import { ElMessageBox } from "element-plus";
import {
  batchDeleteTasks,
  deleteTask,
  getTasks,
  type Task,
  type TaskStatus
} from "@/api/tasks";
import { getAreas, getTemplates } from "@/api/config";
import { getToken } from "@/utils/auth";
import { getJwtUserId } from "@/utils/jwt";
import { message } from "@/utils/message";

const router = useRouter();

const loading = ref(false);
const tasks = ref<Task[]>([]);
const deletingId = ref<number | null>(null);
const batchDeleting = ref(false);
const selectedTaskIds = ref<number[]>([]);
const tableRef = ref();
const pagination = ref({ current: 1, pageSize: 10, total: 0 });
const monthOnly = ref(true);
const plannedRange = ref<[string, string] | null>(null);

// 区域 id -> 名称，用于表格展示
const areaNameMap = ref<Record<number, string>>({});
const templateNameMap = ref<Record<number, string>>({});

// 状态筛选：为空表示不过滤
const statusFilter = ref<TaskStatus | "">("pending");

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

const monthStart = computed(() =>
  dayjs().startOf("month").format("YYYY-MM-DD")
);
const monthEnd = computed(() => dayjs().endOf("month").format("YYYY-MM-DD"));
const plannedRangeShortcuts = [
  {
    text: "本月",
    value: () => [monthStart.value, monthEnd.value]
  },
  {
    text: "上月",
    value: () => {
      const lastMonth = dayjs().subtract(1, "month");
      return [
        lastMonth.startOf("month").format("YYYY-MM-DD"),
        lastMonth.endOf("month").format("YYYY-MM-DD")
      ];
    }
  },
  {
    text: "本季度",
    value: () => {
      const now = dayjs();
      const quarter = Math.floor((now.month() + 3) / 3);
      const start = dayjs()
        .month((quarter - 1) * 3)
        .startOf("month");
      const end = start.add(2, "month").endOf("month");
      return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
    }
  },
  {
    text: "上季度",
    value: () => {
      const now = dayjs().subtract(1, "quarter");
      const quarter = Math.floor((now.month() + 3) / 3);
      const start = dayjs()
        .month((quarter - 1) * 3)
        .startOf("month");
      const end = start.add(2, "month").endOf("month");
      return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
    }
  },
  {
    text: "本年",
    value: () => {
      const now = dayjs();
      return [
        now.startOf("year").format("YYYY-MM-DD"),
        now.endOf("year").format("YYYY-MM-DD")
      ];
    }
  }
];

function handlePlannedRangeChange(value: [string, string] | null) {
  if (value && value.length === 2) {
    monthOnly.value = false;
  } else {
    monthOnly.value = true;
  }
  handleFilterChange();
}

function handleMonthToggle() {
  if (monthOnly.value) {
    plannedRange.value = null;
  }
  handleFilterChange();
}

function taskTypeLabel(taskType: Task["task_type"]) {
  return taskType === "scheduled" ? "计划" : "临时";
}

function assigneeLabel(task: Task) {
  if (task.assignee_name && task.assignee_name.trim()) {
    return task.assignee_name;
  }
  return "-";
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

async function handleBatchDelete() {
  if (selectedTaskIds.value.length === 0) {
    message("请先选择任务", { type: "warning" });
    return;
  }
  const confirmed = await ElMessageBox.confirm(
    `确认删除选中的 ${selectedTaskIds.value.length} 条任务吗？`,
    "提示",
    { type: "warning" }
  )
    .then(() => true)
    .catch(() => false);
  if (!confirmed) return;

  batchDeleting.value = true;
  try {
    const res = await batchDeleteTasks(selectedTaskIds.value);
    message(`已删除 ${res.deleted} 条任务`, { type: "success" });
    selectedTaskIds.value = [];
    tableRef.value?.clearSelection();
    await fetchTasks();
  } finally {
    batchDeleting.value = false;
  }
}

function handleSelectionChange(rows: Task[]) {
  selectedTaskIds.value = rows.map(row => row.id);
}

async function fetchLookups() {
  const [areas, templates] = await Promise.all([getAreas(), getTemplates()]);
  areaNameMap.value = Object.fromEntries(areas.map(x => [x.id, x.name]));
  templateNameMap.value = Object.fromEntries(
    templates.map(x => [x.id, x.name])
  );
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
    if (plannedRange.value && plannedRange.value.length === 2) {
      params.planned_date_start = plannedRange.value[0];
      params.planned_date_end = plannedRange.value[1];
    } else if (monthOnly.value) {
      params.planned_date_start = monthStart.value;
      params.planned_date_end = monthEnd.value;
    }
    const res = await getTasks(params);
    if (Array.isArray(res)) {
      tasks.value = res;
      pagination.value.total = res.length;
    } else {
      tasks.value = res.results;
      pagination.value.total = res.count;
    }
    selectedTaskIds.value = [];
    tableRef.value?.clearSelection();
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
  await fetchLookups();
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
            <el-date-picker
              v-model="plannedRange"
              type="daterange"
              range-separator="至"
              start-placeholder="计划开始"
              end-placeholder="计划结束"
              value-format="YYYY-MM-DD"
              clearable
              :shortcuts="plannedRangeShortcuts"
              @change="handlePlannedRangeChange"
              @clear="handlePlannedRangeChange"
            />
            <el-checkbox v-model="monthOnly" @change="handleMonthToggle">
              仅本月
            </el-checkbox>
          </div>
          <div class="flex items-center gap-2">
            <el-button type="primary" :loading="loading" @click="fetchTasks">
              刷新
            </el-button>
            <el-button
              type="danger"
              :loading="batchDeleting"
              :disabled="selectedTaskIds.length === 0"
              @click="handleBatchDelete"
            >
              批量删除
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

      <el-table
        ref="tableRef"
        :data="tasks"
        border
        :loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="title" label="标题" min-width="160" />
        <el-table-column label="设备名称" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.equipment_name || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="设备编号" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.equipment_code || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="任务类型" width="100">
          <template #default="{ row }">
            <el-tag type="info">{{ taskTypeLabel(row.task_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="区域" min-width="140">
          <template #default="{ row }">
            {{ areaNameMap[row.area] ?? `#${row.area}` }}
          </template>
        </el-table-column>
        <el-table-column label="是否紧急" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_emergency" type="danger">是</el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
        <el-table-column label="执行人" min-width="120">
          <template #default="{ row }">
            {{ assigneeLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="120">
          <template #default="{ row }">
            {{ dayjs(row.due_date).format("YYYY-MM-DD") }}
          </template>
        </el-table-column>
        <el-table-column label="计划日期" width="120">
          <template #default="{ row }">
            {{
              row.planned_date
                ? dayjs(row.planned_date).format("YYYY-MM-DD")
                : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column label="可选模板" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{
              row.template
                ? (templateNameMap[row.template] ?? `#${row.template}`)
                : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column
          label="自定义检查项"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{
              row.custom_check_items?.length
                ? row.custom_check_items.join("、")
                : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || "-" }}
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
