<script setup lang="ts">
/**
 * 领导看板
 * - 自动请求 /dashboard/summary/
 * - 按角色展示范围与模块
 */
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getDashboardSummary, type DashboardSummary } from "@/api/dashboard";
import { hasPerms } from "@/utils/auth";

const router = useRouter();
const loading = ref(false);
const summary = ref<DashboardSummary | null>(null);

const roleLabel = computed(() => {
  const role = summary.value?.role;
  if (role === "admin") return "安全管理员";
  if (role === "inspector") return "巡检员";
  if (role === "manager") return "管理层";
  return role || "-";
});

const scopeLabel = computed(() =>
  summary.value?.scope === "self" ? "仅本人" : "全局"
);

const completionPercent = computed(() => {
  const rate = summary.value?.kpis?.today_task_completion_rate ?? 0;
  return Math.round(rate * 100);
});

const kpis = computed(() => {
  const k = summary.value?.kpis;
  return [
    {
      key: "today_task_total",
      label: "今日任务",
      value: k?.today_task_total ?? 0,
      icon: "ep:calendar",
      color: "#409EFF"
    },
    {
      key: "today_task_completed",
      label: "已完成任务",
      value: k?.today_task_completed ?? 0,
      icon: "ep:circle-check",
      color: "#67C23A"
    },
    {
      key: "pending_emergency_tasks",
      label: "未完成紧急任务",
      value: k?.pending_emergency_tasks ?? 0,
      icon: "ep:warning",
      color: "#E6A23C"
    },
    {
      key: "overdue_task_total",
      label: "超期任务",
      value: k?.overdue_task_total ?? 0,
      icon: "ep:timer",
      color: "#F56C6C"
    },
    {
      key: "open_hazard_total",
      label: "未关闭隐患",
      value: k?.open_hazard_total ?? 0,
      icon: "ep:location",
      color: "#409EFF"
    },
    {
      key: "major_hazard_total",
      label: "重大隐患",
      value: k?.major_hazard_total ?? 0,
      icon: "ep:bell",
      color: "#F56C6C"
    },
    {
      key: "overdue_hazard_total",
      label: "超期隐患",
      value: k?.overdue_hazard_total ?? 0,
      icon: "ep:alarm-clock",
      color: "#E6A23C"
    }
  ];
});

const trendRows = computed(() => {
  const labels = summary.value?.trends?.labels ?? [];
  const tasks = summary.value?.trends?.tasks_completed ?? [];
  const hazards = summary.value?.trends?.hazards_created ?? [];
  return labels.map((label, index) => ({
    label,
    tasks: tasks[index] ?? 0,
    hazards: hazards[index] ?? 0
  }));
});

const overdueTasks = computed(() => summary.value?.alerts?.overdue_tasks ?? []);
const overdueHazards = computed(
  () => summary.value?.alerts?.overdue_hazards ?? []
);

const hazardByArea = computed(
  () => summary.value?.distribution?.hazards_by_area ?? []
);
const taskByArea = computed(
  () => summary.value?.distribution?.tasks_by_area ?? []
);

const actions = computed(() => [
  {
    label: "新建临时任务",
    path: "/tasks/create-adhoc",
    auth: "tasks:create_adhoc",
    icon: "ep:plus"
  },
  {
    label: "我的任务",
    path: "/tasks/my",
    auth: "tasks:my",
    icon: "ep:list"
  },
  {
    label: "隐患列表",
    path: "/hazards/list",
    auth: "hazards:list",
    icon: "ep:warning"
  },
  {
    label: "检查模板",
    path: "/config/templates",
    auth: "config:templates",
    icon: "ep:setting"
  },
  {
    label: "文件管理",
    path: "/files",
    auth: "files",
    icon: "ep:folder"
  }
]);

function goTo(path: string) {
  router.push(path);
}

async function fetchSummary() {
  loading.value = true;
  try {
    summary.value = await getDashboardSummary();
  } finally {
    loading.value = false;
  }
}

onMounted(fetchSummary);
</script>

<template>
  <div class="p-4 dashboard-leader">
    <el-card shadow="never" :loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-medium">总看板</span>
            <el-tag type="info" size="small">{{ roleLabel }}</el-tag>
            <el-tag type="success" size="small">{{ scopeLabel }}</el-tag>
          </div>
          <el-button type="primary" :loading="loading" @click="fetchSummary">
            刷新
          </el-button>
        </div>
      </template>

      <el-row :gutter="12">
        <el-col
          v-for="item in kpis"
          :key="item.key"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card shadow="never" class="kpi-card mb-3">
            <div class="kpi-head">
              <div class="kpi-label">{{ item.label }}</div>
              <IconifyIconOnline
                :icon="item.icon"
                class="kpi-icon"
                :style="{ color: item.color }"
              />
            </div>
            <div class="kpi-value">{{ item.value }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card shadow="never" class="kpi-card mb-3">
            <div class="kpi-head">
              <div class="kpi-label">今日完成率</div>
              <IconifyIconOnline icon="ep:odometer" class="kpi-icon" />
            </div>
            <div class="kpi-value">{{ completionPercent }}%</div>
            <el-progress
              class="mt-2"
              :percentage="completionPercent"
              :stroke-width="10"
            />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="12" class="mt-2">
        <el-col :xs="24" :md="12">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">近7日趋势</div>
            </template>
            <el-table :data="trendRows" size="small" border>
              <el-table-column prop="label" label="日期" width="90" />
              <el-table-column prop="tasks" label="已完成任务" />
              <el-table-column prop="hazards" label="新增隐患" />
            </el-table>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">快捷入口</div>
            </template>
            <div class="action-grid">
              <el-button
                v-for="action in actions"
                :key="action.path"
                class="action-button"
                :disabled="!hasPerms(action.auth)"
                @click="goTo(action.path)"
              >
                <IconifyIconOnline :icon="action.icon" class="mr-1" />
                {{ action.label }}
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="12" class="mt-2">
        <el-col :xs="24" :md="12">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">超期任务</div>
            </template>
            <el-table :data="overdueTasks" size="small" border>
              <el-table-column prop="title" label="任务" min-width="140" />
              <el-table-column prop="assignee_name" label="负责人" width="90" />
              <el-table-column prop="area_name" label="区域" width="100" />
              <el-table-column prop="due_date" label="到期" width="110" />
            </el-table>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">超期隐患</div>
            </template>
            <el-table :data="overdueHazards" size="small" border>
              <el-table-column prop="title" label="隐患" min-width="140" />
              <el-table-column prop="level" label="等级" width="80" />
              <el-table-column prop="area_name" label="区域" width="100" />
              <el-table-column prop="due_date" label="到期" width="110" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="12" class="mt-2">
        <el-col :xs="24" :md="12">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">隐患分布（Top 6）</div>
            </template>
            <el-table :data="hazardByArea" size="small" border>
              <el-table-column prop="name" label="区域" />
              <el-table-column prop="count" label="数量" width="90" />
            </el-table>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">任务分布（Top 6）</div>
            </template>
            <el-table :data="taskByArea" size="small" border>
              <el-table-column prop="name" label="区域" />
              <el-table-column prop="count" label="数量" width="90" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped>
.dashboard-leader .kpi-card {
  border: 1px solid #ebeef5;
}

.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-label {
  font-size: 13px;
  color: #606266;
}

.kpi-value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 600;
}

.kpi-icon {
  font-size: 20px;
}

.section-header {
  font-weight: 600;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.action-button {
  justify-content: flex-start;
}
</style>
