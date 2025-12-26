<script setup lang="ts">
/**
 * 编辑任务页面
 * - 复用临时任务表单结构
 * - 支持修改基础信息与自定义检查项
 */
import { computed, onMounted, reactive, ref, watch } from "vue";
import dayjs from "dayjs";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import { useRoute, useRouter } from "vue-router";
import { getTaskDetail, updateTask } from "@/api/tasks";
import {
  getAreas,
  getTemplates,
  type Area,
  type CheckTemplate
} from "@/api/config";
import { getCurrentUser, getUsers, type AppUser } from "@/api/user";
import HtmlEditor from "@/components/HtmlEditor.vue";

const route = useRoute();
const router = useRouter();

const taskId = computed(() => Number(route.params.id));

const loading = ref(false);
const submitting = ref(false);

const areas = ref<Area[]>([]);
const templates = ref<CheckTemplate[]>([]);
const users = ref<AppUser[]>([]);
const currentUser = ref<AppUser | null>(null);

const formRef = ref<FormInstance>();

const form = reactive<{
  task_type: "scheduled" | "adhoc";
  title: string;
  description: string;
  equipment_name: string;
  equipment_code: string;
  area_id: number | null;
  template_id: number | null;
  assignee_id: number | null;
  due_date: string | null;
  is_emergency: boolean;
  custom_check_items: string[];
}>({
  task_type: "adhoc",
  title: "",
  description: "",
  equipment_name: "",
  equipment_code: "",
  area_id: null,
  template_id: null,
  assignee_id: null,
  due_date: null,
  is_emergency: false,
  custom_check_items: []
});

const newCheckItem = ref("");
const previousTemplateId = ref<number | null>(null);
const isInitializing = ref(true);

const isUsingTemplate = computed(() => !!form.template_id);
const isAdmin = computed(() => currentUser.value?.role === "admin");
const assigneeDisplayName = computed(() => {
  if (!currentUser.value) return "";
  const fullName =
    `${currentUser.value.first_name ?? ""}${currentUser.value.last_name ?? ""}`.trim();
  return fullName || currentUser.value.username;
});

const taskTypeOptions = [
  { label: "计划", value: "scheduled" },
  { label: "临时", value: "adhoc" }
];

const frequencyLabelMap: Record<CheckTemplate["frequency"], string> = {
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
  yearly: "每年"
};

const selectedTemplateFrequencyLabel = computed(() => {
  const template = templates.value.find(item => item.id === form.template_id);
  if (!template) return "-";
  return frequencyLabelMap[template.frequency] ?? template.frequency;
});

function userDisplayName(user: AppUser) {
  const fullName = `${user.first_name ?? ""}${user.last_name ?? ""}`.trim();
  return fullName || user.username;
}

const rules: FormRules = {
  task_type: [{ required: true, message: "请选择任务类型", trigger: "change" }],
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  area_id: [{ required: true, message: "请选择区域", trigger: "change" }],
  assignee_id: [{ required: true, message: "请输入执行人", trigger: "blur" }],
  due_date: [{ required: true, message: "请选择截止日期", trigger: "change" }],
  custom_check_items: [
    {
      validator: (_rule, _value, callback) => {
        if (!isUsingTemplate.value && form.custom_check_items.length === 0) {
          callback(new Error("未选择模板时，至少添加 1 条自定义检查项"));
          return;
        }
        callback();
      },
      trigger: "change"
    }
  ]
};

function addCustomCheckItem() {
  const value = newCheckItem.value.trim();
  if (!value) return;
  if (form.custom_check_items.includes(value)) {
    message("该检查项已存在", { type: "warning" });
    return;
  }
  form.custom_check_items.push(value);
  newCheckItem.value = "";
}

function removeCustomCheckItem(item: string) {
  form.custom_check_items = form.custom_check_items.filter(x => x !== item);
}

function fillFormFromDetail(detail: Awaited<ReturnType<typeof getTaskDetail>>) {
  form.task_type = detail.task_type;
  form.title = detail.title;
  form.description = detail.description ?? "";
  form.equipment_name = detail.equipment_name ?? "";
  form.equipment_code = detail.equipment_code ?? "";
  form.area_id = detail.area;
  form.template_id = detail.template ?? null;
  form.assignee_id = detail.assignee;
  form.due_date = detail.due_date;
  form.is_emergency = detail.is_emergency;
  const customItems = detail.item_records
    .map(r => r.custom_name?.trim())
    .filter((name): name is string => !!name);
  form.custom_check_items = Array.from(new Set(customItems));
  previousTemplateId.value = form.template_id;
}

async function fetchOptionsAndDetail() {
  loading.value = true;
  try {
    const [areasRes, templatesRes, detail, userRes] = await Promise.all([
      getAreas(),
      getTemplates(),
      getTaskDetail(taskId.value),
      getCurrentUser()
    ]);
    areas.value = areasRes;
    templates.value = templatesRes;
    currentUser.value = userRes;
    if (currentUser.value?.role === "admin") {
      users.value = await getUsers();
    }
    fillFormFromDetail(detail);
    isInitializing.value = false;
  } finally {
    loading.value = false;
  }
}

watch(
  () => form.template_id,
  templateId => {
    if (isInitializing.value) return;
    if (!templateId) {
      previousTemplateId.value = null;
      return;
    }
    const template = templates.value.find(item => item.id === templateId);
    if (!template) return;
    const templateCustomItems = template.custom_items ?? [];
    if (previousTemplateId.value === null) {
      form.custom_check_items = Array.from(
        new Set([...templateCustomItems, ...form.custom_check_items])
      );
    } else if (previousTemplateId.value !== templateId) {
      form.custom_check_items = [...templateCustomItems];
    }
    previousTemplateId.value = templateId ?? null;
  }
);

async function handleSubmit() {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) return;

  submitting.value = true;
  try {
    await updateTask(taskId.value, {
      task_type: form.task_type,
      title: form.title,
      description: form.description,
      equipment_name: form.equipment_name || null,
      equipment_code: form.equipment_code || null,
      area: form.area_id!,
      template: form.template_id || null,
      assignee: form.assignee_id!,
      due_date: dayjs(form.due_date!).format("YYYY-MM-DD"),
      is_emergency: form.is_emergency,
      custom_check_items: form.custom_check_items
    });
    message("更新成功", { type: "success" });
    router.push("/tasks/my");
  } finally {
    submitting.value = false;
  }
}

onMounted(fetchOptionsAndDetail);
</script>

<template>
  <div class="p-4">
    <el-card
      class="w-full max-w-[1200px] mx-auto"
      shadow="never"
      :loading="loading"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">编辑任务</span>
          <el-button @click="router.push('/tasks/my')">返回</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
        status-icon
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入任务标题" />
        </el-form-item>

        <el-form-item label="描述">
          <HtmlEditor v-model="form.description" height="180px" />
        </el-form-item>

        <el-form-item label="设备名称">
          <el-input
            v-model="form.equipment_name"
            placeholder="请输入设备名称"
          />
        </el-form-item>

        <el-form-item label="设备编号">
          <el-input
            v-model="form.equipment_code"
            placeholder="请输入设备编号"
          />
        </el-form-item>

        <el-form-item label="任务类型" prop="task_type">
          <el-radio-group v-model="form.task_type">
            <el-radio-button
              v-for="opt in taskTypeOptions"
              :key="opt.value"
              :label="opt.value"
            >
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="选择区域" prop="area_id">
          <el-select v-model="form.area_id" placeholder="请选择区域" filterable>
            <el-option
              v-for="a in areas"
              :key="a.id"
              :label="a.name"
              :value="a.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="是否紧急">
          <el-switch v-model="form.is_emergency" />
        </el-form-item>

        <el-form-item label="选择模板">
          <el-select
            v-model="form.template_id"
            placeholder="可留空"
            clearable
            filterable
          >
            <el-option
              v-for="t in templates"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
          <span class="ml-2 text-gray-500 text-sm">
            未选择模板时需要填写自定义检查项
          </span>
        </el-form-item>
        <el-form-item v-if="isUsingTemplate" label="频率">
          <el-input :model-value="selectedTemplateFrequencyLabel" disabled />
        </el-form-item>

        <el-form-item label="执行人" prop="assignee_id">
          <el-select
            v-if="isAdmin"
            v-model="form.assignee_id"
            placeholder="请选择执行人"
            filterable
          >
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="userDisplayName(u)"
              :value="u.id"
            />
          </el-select>
          <el-input v-else :model-value="assigneeDisplayName" disabled />
        </el-form-item>

        <el-form-item label="截止日期" prop="due_date">
          <el-date-picker
            v-model="form.due_date"
            type="date"
            placeholder="请选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="自定义检查项" prop="custom_check_items">
          <div class="w-full">
            <div class="flex items-center gap-2">
              <el-input
                v-model="newCheckItem"
                placeholder="输入检查项名称，回车或点击添加"
                @keyup.enter="addCustomCheckItem"
              />
              <el-button type="primary" @click="addCustomCheckItem">
                添加
              </el-button>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <el-tag
                v-for="item in form.custom_check_items"
                :key="item"
                closable
                @close="removeCustomCheckItem(item)"
              >
                {{ item }}
              </el-tag>
              <span
                v-if="form.custom_check_items.length === 0"
                class="text-gray-500 text-sm"
              >
                暂无自定义检查项
              </span>
            </div>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            保存修改
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
