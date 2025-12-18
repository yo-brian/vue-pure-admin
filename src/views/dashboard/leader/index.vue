<script setup lang="ts">
/**
 * 领导看板
 * - 加载时自动请求 /dashboard/summary/
 * - 提供“刷新”按钮手动刷新
 */
import { computed, onMounted, ref } from "vue";
import { getDashboardSummary, type DashboardSummary } from "@/api/dashboard";

const loading = ref(false);
const summary = ref<DashboardSummary | null>(null);

const completionPercent = computed(() => {
  const rate = summary.value?.today_task_completion_rate ?? 0;
  return Math.round(rate * 100);
});

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
  <div class="p-4">
    <el-card shadow="never" :loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">总看板</span>
          <el-button type="primary" :loading="loading" @click="fetchSummary">
            刷新
          </el-button>
        </div>
      </template>

      <el-row :gutter="12">
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card shadow="never" class="mb-3">
            <div class="text-gray-500 text-sm">今日任务总数</div>
            <div class="text-2xl font-semibold">
              {{ summary?.today_task_total ?? "-" }}
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card shadow="never" class="mb-3">
            <div class="text-gray-500 text-sm">今日已完成任务数</div>
            <div class="text-2xl font-semibold">
              {{ summary?.today_task_completed ?? "-" }}
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card shadow="never" class="mb-3">
            <div class="text-gray-500 text-sm">完成率</div>
            <div class="text-2xl font-semibold">{{ completionPercent }}%</div>
            <el-progress
              class="mt-2"
              :percentage="completionPercent"
              :stroke-width="10"
            />
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card shadow="never" class="mb-3">
            <div class="text-gray-500 text-sm">未完成紧急任务</div>
            <div class="text-2xl font-semibold">
              {{ summary?.pending_emergency_tasks ?? "-" }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card shadow="never">
            <div class="text-gray-500 text-sm">未关闭隐患总数</div>
            <div class="text-2xl font-semibold">
              {{ summary?.open_hazard_total ?? "-" }}
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card shadow="never">
            <div class="text-gray-500 text-sm">重大隐患数量</div>
            <div class="text-2xl font-semibold">
              {{ summary?.major_hazard_total ?? "-" }}
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>
