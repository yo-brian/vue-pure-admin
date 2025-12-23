<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getAreas } from "@/api/config";
import {
  getHazards,
  transitionHazardStatus,
  type Hazard,
  type HazardLevel,
  type HazardStatus
} from "@/api/hazards";

const loading = ref(false);
const hazards = ref<Hazard[]>([]);

const areaNameMap = ref<Record<number, string>>({});
const statusFilter = ref<HazardStatus | "">("");
const levelFilter = ref<HazardLevel | "">("");
const areaFilter = ref<number | "">("");
const keyword = ref("");
const departmentFilter = ref("");
const taskFilter = ref<number | null>(null);
const dueRange = ref<[string, string] | null>(null);

const dialogVisible = ref(false);
const currentHazard = ref<Hazard | null>(null);

const transitionLoading = reactive<Record<number, boolean>>({});
const pagination = ref({ current: 1, pageSize: 10, total: 0 });

const statusOptions: Array<{ label: string; value: HazardStatus }> = [
  { label: "待整改", value: "to_fix" },
  { label: "整改中", value: "fixing" },
  { label: "待复查", value: "to_review" },
  { label: "已关闭", value: "closed" }
];

const levelOptions: Array<{ label: string; value: HazardLevel }> = [
  { label: "一般", value: "minor" },
  { label: "重大", value: "major" }
];

function statusLabel(status: HazardStatus) {
  return statusOptions.find(x => x.value === status)?.label ?? status;
}

function statusTagType(status: HazardStatus) {
  if (status === "closed") return "success";
  if (status === "to_review") return "warning";
  if (status === "fixing") return "info";
  return "danger";
}

function levelLabel(level: HazardLevel) {
  return levelOptions.find(x => x.value === level)?.label ?? level;
}

function levelTagType(level: HazardLevel) {
  return level === "major" ? "danger" : "warning";
}

function openDetail(row: Hazard) {
  currentHazard.value = row;
  dialogVisible.value = true;
}

async function fetchAreas() {
  const list = await getAreas();
  areaNameMap.value = Object.fromEntries(list.map(x => [x.id, x.name]));
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
    if (departmentFilter.value.trim())
      params.department = departmentFilter.value.trim();
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

async function handleTransition(row: Hazard, status: "to_review" | "closed") {
  transitionLoading[row.id] = true;
  try {
    await transitionHazardStatus(row.id, status);
    message("状态更新成功", { type: "success" });
    await fetchHazards();
  } finally {
    transitionLoading[row.id] = false;
  }
}

onMounted(async () => {
  await fetchAreas();
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
              placeholder="搜索标题/描述/编号"
              clearable
              style="width: 200px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
            <el-input
              v-model="departmentFilter"
              placeholder="部门"
              clearable
              style="width: 160px"
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
        <el-table-column prop="title" label="隐患标题" min-width="200" />
        <el-table-column label="区域" min-width="140">
          <template #default="{ row }">
            {{ areaNameMap[row.area] ?? `#${row.area}` }}
          </template>
        </el-table-column>
        <el-table-column label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="levelTagType(row.level)">
              {{ levelLabel(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="责任人" width="140">
          <template #default="{ row }">
            {{
              row.responsible_full_name ??
              row.responsible_name ??
              row.responsible ??
              "-"
            }}
          </template>
        </el-table-column>
        <el-table-column label="部门" min-width="120">
          <template #default="{ row }">
            {{ row.department ?? "-" }}
          </template>
        </el-table-column>
        <el-table-column label="整改期限" width="120">
          <template #default="{ row }">
            {{ row.due_date ? dayjs(row.due_date).format("YYYY-MM-DD") : "-" }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ dayjs(row.created_at).format("YYYY-MM-DD HH:mm") }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">
              查看
            </el-button>
            <el-button
              v-if="row.status !== 'to_review' && row.status !== 'closed'"
              link
              type="warning"
              :loading="transitionLoading[row.id]"
              @click="handleTransition(row, 'to_review')"
            >
              转待复查
            </el-button>
            <el-popconfirm
              title="确认关闭该隐患吗？"
              @confirm="handleTransition(row, 'closed')"
            >
              <template #reference>
                <el-button
                  v-if="row.status !== 'closed'"
                  link
                  type="danger"
                  :loading="transitionLoading[row.id]"
                >
                  关闭
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

    <el-dialog v-model="dialogVisible" title="隐患详情" width="560px">
      <template v-if="currentHazard">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="编号">
            {{ currentHazard.id }}
          </el-descriptions-item>
          <el-descriptions-item label="任务ID">
            {{ currentHazard.task }}
          </el-descriptions-item>
          <el-descriptions-item label="区域">
            {{ areaNameMap[currentHazard.area] ?? `#${currentHazard.area}` }}
          </el-descriptions-item>
          <el-descriptions-item label="等级">
            {{ levelLabel(currentHazard.level) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ statusLabel(currentHazard.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="责任人">
            {{
              currentHazard.responsible_full_name ??
              currentHazard.responsible_name ??
              currentHazard.responsible ??
              "-"
            }}
          </el-descriptions-item>
          <el-descriptions-item label="整改期限">
            {{
              currentHazard.due_date
                ? dayjs(currentHazard.due_date).format("YYYY-MM-DD")
                : "-"
            }}
          </el-descriptions-item>
          <el-descriptions-item label="部门">
            {{ currentHazard.department ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="标题" :span="2">
            {{ currentHazard.title }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ currentHazard.description }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>
