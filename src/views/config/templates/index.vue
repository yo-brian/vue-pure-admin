<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import dayjs from "dayjs";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import {
  createTemplate,
  deleteTemplate,
  getAreas,
  getTemplates,
  getTemplateScheduleConfig,
  getTemplateScheduleLogs,
  runTemplateScheduleNow,
  type TemplateScheduleRunParams,
  type Area,
  type CheckTemplate,
  type TemplateScheduleConfig,
  type TemplateScheduleRunLog,
  updateTemplate,
  updateTemplateScheduleConfig
} from "@/api/config";
import { getUsers, type AppUser } from "@/api/user";
import HtmlEditor from "@/components/HtmlEditor.vue";

const labels = {
  title: "检查模板",
  refresh: "刷新",
  create: "新增模板",
  name: "模板名称",
  area: "区域",
  type: "类型",
  frequency: "频率",
  plannedDate: "计划日期",
  dueDate: "截止日期",
  status: "状态",
  defaultLevel: "默认风险等级",
  customItems: "自定义检查项",
  addItem: "添加",
  customItemPlaceholder: "输入检查项名称，回车或点击添加",
  customItemEmpty: "暂无自定义检查项",
  description: "描述",
  action: "操作",
  edit: "编辑",
  remove: "删除",
  confirmDelete: "确认删除该模板吗？",
  dialogEdit: "编辑模板",
  dialogCreate: "新增模板",
  selectArea: "请选择区域",
  selectType: "请选择类型",
  selectFrequency: "请选择频率",
  selectStatus: "请选择状态",
  selectLevel: "请选择等级",
  optional: "可选",
  save: "保存",
  cancel: "取消",
  nameRequired: "请输入模板名称",
  frequencyRequired: "请选择频率",
  statusRequired: "请选择状态",
  updated: "更新成功",
  created: "新增成功",
  deleted: "删除成功",
  planned: "计划任务",
  adhoc: "临时任务",
  minor: "一般",
  major: "重大",
  active: "启用",
  inactive: "停用",
  scheduleTitle: "定时任务",
  scheduleEnabled: "启用",
  scheduleTime: "执行时间",
  scheduleSave: "保存设置",
  scheduleRunNow: "立即执行",
  scheduleLogs: "最近执行日志",
  scheduleLimit: "日志条数",
  scheduleStatus: "状态",
  scheduleSource: "来源",
  scheduleCreatedCount: "创建数量",
  scheduleMessage: "信息",
  scheduleTriggeredBy: "触发人",
  scheduleStartedAt: "开始时间",
  scheduleFinishedAt: "结束时间",
  scheduleViewAll: "查看全部日志",
  scheduleAllTitle: "全部执行日志",
  scheduleRunRange: "日期区间",
  scheduleRunAssignees: "执行人",
  scheduleRunHint: "仅对勾选模板生效",
  scheduleConfirmTitle: "确认执行",
  scheduleConfirmOk: "立即执行",
  scheduleConfirmCancel: "取消",
  scheduleNeedTemplate: "请先勾选模板",
  scheduleNeedRange: "请先选择日期区间",
  scheduleConfirmText: "将对选中模板在指定日期区间内生成任务，确认继续吗？",
  scheduleErrorTitle: "执行失败",
  scheduleErrorFallback: "执行失败，请稍后重试",
  scheduleRefresh: "刷新",
  weeklyDay: "每周哪天",
  monthlyDay: "每月哪天",
  yearlyMonth: "每年月份",
  yearlyDay: "每年哪天",
  selectWeeklyDay: "请选择星期",
  selectMonthlyDay: "请输入日期",
  selectYearlyMonth: "请选择月份",
  selectYearlyDay: "请输入日期"
};

const loading = ref(false);
const submitting = ref(false);
const templates = ref<CheckTemplate[]>([]);
const areas = ref<Area[]>([]);
const assignees = ref<AppUser[]>([]);
const selectedTemplateRows = ref<CheckTemplate[]>([]);
const selectedAssignees = ref<number[]>([]);
const today = dayjs().format("YYYY-MM-DD");
const runDateRange = ref<[string, string] | null>([today, today]);

const runDateRangeShortcuts = [
  {
    text: "今日",
    value: () => {
      const value = dayjs().format("YYYY-MM-DD");
      return [value, value];
    }
  },
  {
    text: "本月",
    value: () => [
      dayjs().startOf("month").format("YYYY-MM-DD"),
      dayjs().endOf("month").format("YYYY-MM-DD")
    ]
  },
  {
    text: "本季",
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
    text: "本年",
    value: () => [
      dayjs().startOf("year").format("YYYY-MM-DD"),
      dayjs().endOf("year").format("YYYY-MM-DD")
    ]
  }
];

const scheduleConfig = reactive<TemplateScheduleConfig>({
  id: 0,
  enabled: false,
  run_time: "00:05:00",
  updated_at: ""
});
const scheduleLoading = ref(false);
const scheduleSaving = ref(false);
const scheduleRunning = ref(false);
const scheduleLogsLoading = ref(false);
const scheduleLogs = ref<TemplateScheduleRunLog[]>([]);
const scheduleLogLimit = ref(3);
const scheduleAllVisible = ref(false);
const scheduleAllLoading = ref(false);
const scheduleAllLogs = ref<TemplateScheduleRunLog[]>([]);
const scheduleAllPage = ref(1);
const scheduleAllPageSize = ref(10);
const scheduleAllPagedLogs = computed(() => {
  const start = (scheduleAllPage.value - 1) * scheduleAllPageSize.value;
  return scheduleAllLogs.value.slice(start, start + scheduleAllPageSize.value);
});

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstance>();
const form = reactive<{
  name: string;
  description: string;
  frequency: CheckTemplate["frequency"] | "";
  area_id: number | null;
  task_type: CheckTemplate["task_type"] | "";
  due_date: string | null;
  planned_date: string | null;
  status: CheckTemplate["status"] | "";
  default_hazard_level: CheckTemplate["default_hazard_level"] | "";
  weekly_day: number | null;
  monthly_day: number | null;
  yearly_month: number | null;
  yearly_day: number | null;
  custom_items: string[];
}>({
  name: "",
  description: "",
  frequency: "",
  area_id: null,
  task_type: "",
  due_date: null,
  planned_date: null,
  status: "active",
  default_hazard_level: "",
  weekly_day: null,
  monthly_day: null,
  yearly_month: null,
  yearly_day: null,
  custom_items: []
});

const newCustomItem = ref("");

const areaNameMap = computed(() =>
  Object.fromEntries(areas.value.map(area => [area.id, area.name]))
);

const frequencyOptions: Array<{
  label: string;
  value: CheckTemplate["frequency"];
}> = [
  { label: "每日", value: "daily" },
  { label: "每周", value: "weekly" },
  { label: "每月", value: "monthly" },
  { label: "每年", value: "yearly" }
];

const weekdayOptions = [
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
  { label: "周日", value: 7 }
];

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1}月`,
  value: index + 1
}));

const taskTypeOptions: Array<{
  label: string;
  value: NonNullable<CheckTemplate["task_type"]>;
}> = [
  { label: labels.planned, value: "scheduled" },
  { label: labels.adhoc, value: "adhoc" }
];

const hazardLevelOptions: Array<{
  label: string;
  value: NonNullable<CheckTemplate["default_hazard_level"]>;
}> = [
  { label: labels.minor, value: "minor" },
  { label: labels.major, value: "major" }
];

const statusOptions: Array<{
  label: string;
  value: NonNullable<CheckTemplate["status"]>;
}> = [
  { label: labels.active, value: "active" },
  { label: labels.inactive, value: "inactive" }
];

const rules: FormRules = {
  name: [{ required: true, message: labels.nameRequired, trigger: "blur" }],
  frequency: [
    { required: true, message: labels.frequencyRequired, trigger: "change" }
  ],
  status: [
    { required: true, message: labels.statusRequired, trigger: "change" }
  ]
};

watch(
  () => form.frequency,
  value => {
    if (value !== "weekly") form.weekly_day = null;
    if (value !== "monthly") form.monthly_day = null;
    if (value !== "yearly") {
      form.yearly_month = null;
      form.yearly_day = null;
    }
  }
);

function resetForm() {
  form.name = "";
  form.description = "";
  form.frequency = "";
  form.area_id = null;
  form.task_type = "";
  form.due_date = null;
  form.planned_date = null;
  form.status = "active";
  form.default_hazard_level = "";
  form.weekly_day = null;
  form.monthly_day = null;
  form.yearly_month = null;
  form.yearly_day = null;
  form.custom_items = [];
  formRef.value?.clearValidate();
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: CheckTemplate) {
  isEdit.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.description = row.description ?? "";
  form.frequency = row.frequency;
  form.area_id = row.area ?? null;
  form.task_type = row.task_type ?? "";
  form.due_date = row.due_date ?? null;
  form.planned_date = row.planned_date ?? null;
  form.status = row.status ?? "active";
  form.default_hazard_level = row.default_hazard_level ?? "";
  form.weekly_day = row.weekly_day ?? null;
  form.monthly_day = row.monthly_day ?? null;
  form.yearly_month = row.yearly_month ?? null;
  form.yearly_day = row.yearly_day ?? null;
  form.custom_items = row.custom_items ? [...row.custom_items] : [];
  dialogVisible.value = true;
}

async function fetchTemplates() {
  loading.value = true;
  try {
    templates.value = await getTemplates();
  } finally {
    loading.value = false;
  }
}

async function fetchScheduleConfig() {
  scheduleLoading.value = true;
  try {
    const data = await getTemplateScheduleConfig();
    scheduleConfig.id = data.id;
    scheduleConfig.enabled = data.enabled;
    scheduleConfig.run_time = data.run_time;
    scheduleConfig.updated_at = data.updated_at;
  } finally {
    scheduleLoading.value = false;
  }
}

async function saveScheduleConfig() {
  scheduleSaving.value = true;
  try {
    const data = await updateTemplateScheduleConfig({
      enabled: scheduleConfig.enabled,
      run_time: scheduleConfig.run_time
    });
    scheduleConfig.id = data.id;
    scheduleConfig.enabled = data.enabled;
    scheduleConfig.run_time = data.run_time;
    scheduleConfig.updated_at = data.updated_at;
    message("保存成功", { type: "success" });
  } finally {
    scheduleSaving.value = false;
  }
}

async function fetchScheduleLogs() {
  scheduleLogsLoading.value = true;
  try {
    scheduleLogs.value = await getTemplateScheduleLogs(scheduleLogLimit.value);
  } finally {
    scheduleLogsLoading.value = false;
  }
}

async function fetchAllScheduleLogs() {
  scheduleAllLoading.value = true;
  try {
    scheduleAllLogs.value = await getTemplateScheduleLogs(50);
  } finally {
    scheduleAllLoading.value = false;
  }
}

async function handleViewAllLogs() {
  scheduleAllVisible.value = true;
  scheduleAllPage.value = 1;
  await fetchAllScheduleLogs();
}

function handleScheduleAllPageChange(page: number) {
  scheduleAllPage.value = page;
}

function handleScheduleAllSizeChange(size: number) {
  scheduleAllPageSize.value = size;
  scheduleAllPage.value = 1;
}

async function handleRunScheduleNow() {
  if (selectedTemplateRows.value.length === 0) {
    message(labels.scheduleNeedTemplate, { type: "warning" });
    return;
  }
  if (!runDateRange.value || runDateRange.value.length !== 2) {
    message(labels.scheduleNeedRange, { type: "warning" });
    return;
  }

  const [startDate, endDate] = runDateRange.value;
  const templateNames = selectedTemplateRows.value
    .map(item => item.name)
    .join(", ");
  const assigneeCount = selectedAssignees.value.length;

  const confirmed = await ElMessageBox.confirm(
    `${labels.scheduleConfirmText}\n模板: ${templateNames}\n区间: ${startDate} ~ ${endDate}\n手动指定执行人: ${assigneeCount}`,
    labels.scheduleConfirmTitle,
    {
      type: "warning",
      confirmButtonText: labels.scheduleConfirmOk,
      cancelButtonText: labels.scheduleConfirmCancel,
      closeOnClickModal: false
    }
  )
    .then(() => true)
    .catch(() => false);

  if (!confirmed) return;

  scheduleRunning.value = true;
  try {
    const payload: TemplateScheduleRunParams = {
      template_ids: selectedTemplateRows.value.map(item => item.id),
      assignee_ids: selectedAssignees.value,
      start_date: startDate,
      end_date: endDate
    };
    await runTemplateScheduleNow(payload, { hideError: true });
    message("已触发执行", { type: "success" });
    await fetchScheduleLogs();
  } catch (error) {
    const detail =
      error?.response?.data?.detail ||
      error?.message ||
      labels.scheduleErrorFallback;
    await ElMessageBox.alert(detail, labels.scheduleErrorTitle, {
      type: "error",
      confirmButtonText: labels.scheduleConfirmOk
    });
  } finally {
    scheduleRunning.value = false;
  }
}

function logStatusType(value: TemplateScheduleRunLog["status"]) {
  return value === "success" ? "success" : "danger";
}

function formatLogTime(value?: string | null) {
  if (!value) return "-";
  return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
}

async function fetchAreas() {
  const list = await getAreas();
  areas.value = list;
}

async function fetchUsers() {
  assignees.value = await getUsers();
}

function handleTemplateSelection(rows: CheckTemplate[]) {
  selectedTemplateRows.value = rows;
}

function formatAssigneeLabel(user: AppUser) {
  const name = [user.last_name, user.first_name].filter(Boolean).join("");
  return name ? `${user.username} (${name})` : user.username;
}

async function handleSubmit() {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) return;
  submitting.value = true;
  try {
    if (isEdit.value && editingId.value) {
      await updateTemplate(editingId.value, {
        name: form.name,
        description: form.description,
        frequency: form.frequency as CheckTemplate["frequency"],
        area: form.area_id,
        task_type: form.task_type || null,
        planned_date: form.planned_date,
        due_date: form.due_date,
        status: (form.status as CheckTemplate["status"]) || "active",
        default_hazard_level: form.default_hazard_level || null,
        weekly_day: form.weekly_day,
        monthly_day: form.monthly_day,
        yearly_month: form.yearly_month,
        yearly_day: form.yearly_day,
        custom_items: form.custom_items
      });
      message(labels.updated, { type: "success" });
    } else {
      await createTemplate({
        name: form.name,
        description: form.description,
        frequency: form.frequency as CheckTemplate["frequency"],
        area: form.area_id,
        task_type: form.task_type || null,
        planned_date: form.planned_date,
        due_date: form.due_date,
        status: (form.status as CheckTemplate["status"]) || "active",
        default_hazard_level: form.default_hazard_level || null,
        weekly_day: form.weekly_day,
        monthly_day: form.monthly_day,
        yearly_month: form.yearly_month,
        yearly_day: form.yearly_day,
        custom_items: form.custom_items
      });
      message(labels.created, { type: "success" });
    }
    dialogVisible.value = false;
    await fetchTemplates();
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: CheckTemplate) {
  await deleteTemplate(row.id);
  message(labels.deleted, { type: "success" });
  await fetchTemplates();
}

function addCustomItem() {
  const value = newCustomItem.value.trim();
  if (!value) return;
  if (form.custom_items.includes(value)) {
    message("该检查项已存在", { type: "warning" });
    return;
  }
  form.custom_items.push(value);
  newCustomItem.value = "";
}

function removeCustomItem(item: string) {
  form.custom_items = form.custom_items.filter(x => x !== item);
}

onMounted(async () => {
  await fetchAreas();
  await fetchUsers();
  await fetchTemplates();
  await fetchScheduleConfig();
  await fetchScheduleLogs();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ labels.scheduleTitle }}</span>
          <el-button :loading="scheduleLoading" @click="fetchScheduleConfig">
            {{ labels.scheduleRefresh }}
          </el-button>
        </div>
      </template>
      <el-form :model="scheduleConfig" inline>
        <el-form-item :label="labels.scheduleEnabled">
          <el-switch v-model="scheduleConfig.enabled" />
        </el-form-item>
        <el-form-item :label="labels.scheduleTime">
          <el-time-picker
            v-model="scheduleConfig.run_time"
            value-format="HH:mm:ss"
            format="HH:mm"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="scheduleSaving"
            @click="saveScheduleConfig"
          >
            {{ labels.scheduleSave }}
          </el-button>
          <el-button
            type="success"
            :loading="scheduleRunning"
            @click="handleRunScheduleNow"
          >
            {{ labels.scheduleRunNow }}
          </el-button>
          <span class="text-sm text-gray-500 ml-2">{{
            labels.scheduleRunHint
          }}</span>
        </el-form-item>
        <el-form-item :label="labels.scheduleRunRange">
          <el-date-picker
            v-model="runDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            :clearable="false"
            range-separator="~"
            :shortcuts="runDateRangeShortcuts"
          />
        </el-form-item>
        <el-form-item :label="labels.scheduleRunAssignees">
          <el-select
            v-model="selectedAssignees"
            multiple
            filterable
            clearable
            collapse-tags
            collapse-tags-tooltip
            :placeholder="labels.optional"
          >
            <el-option
              v-for="user in assignees"
              :key="user.id"
              :label="formatAssigneeLabel(user)"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="mt-4">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium">{{ labels.scheduleLogs }}</span>
          <div class="flex items-center gap-2">
            <el-button
              size="small"
              :loading="scheduleLogsLoading"
              @click="fetchScheduleLogs"
            >
              {{ labels.scheduleRefresh }}
            </el-button>
            <el-button size="small" @click="handleViewAllLogs">
              {{ labels.scheduleViewAll }}
            </el-button>
          </div>
        </div>
        <el-table
          :data="scheduleLogs"
          border
          size="small"
          :loading="scheduleLogsLoading"
        >
          <el-table-column :label="labels.scheduleStatus" width="90">
            <template #default="{ row }">
              <el-tag :type="logStatusType(row.status)">
                {{ row.status === "success" ? "成功" : "失败" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="labels.scheduleSource" width="100">
            <template #default="{ row }">
              {{ row.run_source === "beat" ? "定时" : "手动" }}
            </template>
          </el-table-column>
          <el-table-column :label="labels.scheduleCreatedCount" width="100">
            <template #default="{ row }">
              {{ row.created_count }}
            </template>
          </el-table-column>
          <el-table-column :label="labels.scheduleTriggeredBy" width="120">
            <template #default="{ row }">
              {{ row.triggered_by_name ?? "-" }}
            </template>
          </el-table-column>
          <el-table-column :label="labels.scheduleStartedAt" width="160">
            <template #default="{ row }">
              {{ formatLogTime(row.started_at) }}
            </template>
          </el-table-column>
          <el-table-column :label="labels.scheduleFinishedAt" width="160">
            <template #default="{ row }">
              {{ formatLogTime(row.finished_at) }}
            </template>
          </el-table-column>
          <el-table-column
            :label="labels.scheduleMessage"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.message || "-" }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog
      v-model="scheduleAllVisible"
      :title="labels.scheduleAllTitle"
      width="960px"
    >
      <el-table
        :data="scheduleAllPagedLogs"
        border
        size="small"
        :loading="scheduleAllLoading"
      >
        <el-table-column :label="labels.scheduleStatus" width="90">
          <template #default="{ row }">
            <el-tag :type="logStatusType(row.status)">
              {{ row.status === "success" ? "成功" : "失败" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="labels.scheduleSource" width="100">
          <template #default="{ row }">
            {{ row.run_source === "beat" ? "定时" : "手动" }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.scheduleCreatedCount" width="100">
          <template #default="{ row }">
            {{ row.created_count }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.scheduleTriggeredBy" width="120">
          <template #default="{ row }">
            {{ row.triggered_by_name ?? "-" }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.scheduleStartedAt" width="160">
          <template #default="{ row }">
            {{ formatLogTime(row.started_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.scheduleFinishedAt" width="160">
          <template #default="{ row }">
            {{ formatLogTime(row.finished_at) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="labels.scheduleMessage"
          min-width="240"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.message || "-" }}
          </template>
        </el-table-column>
      </el-table>
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:currentPage="scheduleAllPage"
          :page-size="scheduleAllPageSize"
          :total="scheduleAllLogs.length"
          :page-sizes="[10, 20, 50]"
          :background="true"
          layout="total, sizes, prev, pager, next"
          @size-change="handleScheduleAllSizeChange"
          @current-change="handleScheduleAllPageChange"
        />
      </div>
    </el-dialog>
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ labels.title }}</span>
          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="fetchTemplates">
              {{ labels.refresh }}
            </el-button>
            <el-button type="primary" @click="openCreate">
              {{ labels.create }}
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="templates"
        border
        :loading="loading"
        style="width: 100%"
        @selection-change="handleTemplateSelection"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="name" :label="labels.name" min-width="180" />
        <el-table-column :label="labels.area" min-width="140">
          <template #default="{ row }">
            {{ areaNameMap[row.area] ?? (row.area ? `#${row.area}` : "-") }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.type" width="120">
          <template #default="{ row }">
            {{
              taskTypeOptions.find(opt => opt.value === row.task_type)?.label ??
              row.task_type ??
              "-"
            }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.frequency" width="120">
          <template #default="{ row }">
            {{
              frequencyOptions.find(opt => opt.value === row.frequency)
                ?.label ?? row.frequency
            }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.plannedDate" width="140">
          <template #default="{ row }">
            {{ row.planned_date || "-" }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.dueDate" width="140">
          <template #default="{ row }">
            {{ row.due_date || "-" }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.status" width="100">
          <template #default="{ row }">
            {{
              statusOptions.find(opt => opt.value === row.status)?.label ??
              row.status ??
              "-"
            }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.defaultLevel" width="140">
          <template #default="{ row }">
            {{
              hazardLevelOptions.find(
                opt => opt.value === row.default_hazard_level
              )?.label ??
              row.default_hazard_level ??
              "-"
            }}
          </template>
        </el-table-column>
        <el-table-column
          :label="labels.customItems"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.custom_items?.length ? row.custom_items.join("、") : "-" }}
          </template>
        </el-table-column>
        <el-table-column
          :label="labels.description"
          min-width="240"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.description || "-" }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.action" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">
              {{ labels.edit }}
            </el-button>
            <el-popconfirm
              :title="labels.confirmDelete"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button link type="danger">{{ labels.remove }}</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? labels.dialogEdit : labels.dialogCreate"
      width="760px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="labels.name" prop="name">
          <el-input v-model="form.name" :placeholder="labels.nameRequired" />
        </el-form-item>
        <el-form-item :label="labels.area">
          <el-select
            v-model="form.area_id"
            :placeholder="labels.selectArea"
            clearable
            filterable
          >
            <el-option
              v-for="area in areas"
              :key="area.id"
              :label="area.name"
              :value="area.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="labels.type">
          <el-select
            v-model="form.task_type"
            :placeholder="labels.selectType"
            clearable
          >
            <el-option
              v-for="opt in taskTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="labels.frequency" prop="frequency">
          <el-select
            v-model="form.frequency"
            :placeholder="labels.selectFrequency"
          >
            <el-option
              v-for="opt in frequencyOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.frequency === 'weekly'"
          :label="labels.weeklyDay"
        >
          <el-select
            v-model="form.weekly_day"
            :placeholder="labels.selectWeeklyDay"
            clearable
          >
            <el-option
              v-for="opt in weekdayOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.frequency === 'monthly'"
          :label="labels.monthlyDay"
        >
          <el-input-number
            v-model="form.monthly_day"
            :min="1"
            :max="31"
            controls-position="right"
            :placeholder="labels.selectMonthlyDay"
          />
        </el-form-item>
        <el-form-item
          v-if="form.frequency === 'yearly'"
          :label="labels.yearlyMonth"
        >
          <el-select
            v-model="form.yearly_month"
            :placeholder="labels.selectYearlyMonth"
            clearable
          >
            <el-option
              v-for="opt in monthOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.frequency === 'yearly'"
          :label="labels.yearlyDay"
        >
          <el-input-number
            v-model="form.yearly_day"
            :min="1"
            :max="31"
            controls-position="right"
            :placeholder="labels.selectYearlyDay"
          />
        </el-form-item>
        <el-form-item :label="labels.plannedDate">
          <el-date-picker
            v-model="form.planned_date"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="labels.optional"
          />
        </el-form-item>
        <el-form-item :label="labels.dueDate">
          <el-date-picker
            v-model="form.due_date"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="labels.optional"
          />
        </el-form-item>
        <el-form-item :label="labels.status" prop="status">
          <el-select
            v-model="form.status"
            :placeholder="labels.selectStatus"
            clearable
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="labels.defaultLevel">
          <el-select
            v-model="form.default_hazard_level"
            :placeholder="labels.selectLevel"
            clearable
          >
            <el-option
              v-for="opt in hazardLevelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="labels.customItems">
          <div class="w-full">
            <div class="flex items-center gap-2">
              <el-input
                v-model="newCustomItem"
                :placeholder="labels.customItemPlaceholder"
                @keyup.enter="addCustomItem"
              />
              <el-button type="primary" @click="addCustomItem">
                {{ labels.addItem }}
              </el-button>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <el-tag
                v-for="item in form.custom_items"
                :key="item"
                closable
                @close="removeCustomItem(item)"
              >
                {{ item }}
              </el-tag>
              <span
                v-if="form.custom_items.length === 0"
                class="text-gray-500 text-sm"
              >
                {{ labels.customItemEmpty }}
              </span>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="labels.description">
          <HtmlEditor
            v-model="form.description"
            height="180px"
            :placeholder="labels.optional"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">{{
            labels.cancel
          }}</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ labels.save }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
