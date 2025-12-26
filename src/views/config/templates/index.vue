<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import {
  createTemplate,
  deleteTemplate,
  getAreas,
  getTemplates,
  type Area,
  type CheckTemplate,
  updateTemplate
} from "@/api/config";
import HtmlEditor from "@/components/HtmlEditor.vue";

const labels = {
  title: "检查模板",
  refresh: "刷新",
  create: "新增模板",
  name: "模板名称",
  description: "描述",
  customItems: "自定义检查项",
  addItem: "添加",
  customItemPlaceholder: "输入检查项名称，回车或点击添加",
  customItemEmpty: "暂无自定义检查项",
  frequency: "频率",
  area: "适用区域",
  type: "适用类型",
  defaultDue: "默认截止周期",
  defaultEmergency: "默认紧急",
  defaultLevel: "默认风险等级",
  attachment: "附件要求",
  action: "操作",
  edit: "编辑",
  remove: "删除",
  confirmDelete: "确认删除该模板吗？",
  dialogEdit: "编辑模板",
  dialogCreate: "新增模板",
  selectArea: "请选择区域",
  selectType: "请选择类型",
  selectFrequency: "请选择频率",
  selectLevel: "请选择等级",
  optional: "可选",
  save: "保存",
  cancel: "取消",
  day: "天",
  sheet: "张",
  required: "必填",
  notRequired: "不需要",
  yes: "是",
  no: "否",
  nameRequired: "请输入模板名称",
  frequencyRequired: "请选择频率",
  attachmentRequired: "请输入附件数量",
  updated: "更新成功",
  created: "新增成功",
  deleted: "删除成功",
  planned: "计划任务",
  adhoc: "临时任务",
  minor: "一般",
  major: "重大"
};

const loading = ref(false);
const submitting = ref(false);
const templates = ref<CheckTemplate[]>([]);
const areas = ref<Area[]>([]);

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
  default_due_days: number | null;
  is_emergency_default: boolean;
  default_hazard_level: CheckTemplate["default_hazard_level"] | "";
  attachment_required: boolean;
  attachment_count: number | null;
  custom_items: string[];
}>({
  name: "",
  description: "",
  frequency: "",
  area_id: null,
  task_type: "",
  default_due_days: null,
  is_emergency_default: false,
  default_hazard_level: "",
  attachment_required: false,
  attachment_count: null,
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
  { label: labels.day, value: "daily" },
  { label: "每周", value: "weekly" },
  { label: "每月", value: "monthly" },
  { label: "每年", value: "yearly" }
];

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

const rules: FormRules = {
  name: [{ required: true, message: labels.nameRequired, trigger: "blur" }],
  frequency: [
    { required: true, message: labels.frequencyRequired, trigger: "change" }
  ],
  attachment_count: [
    {
      validator: (_rule, _value, callback) => {
        if (form.attachment_required && !form.attachment_count) {
          callback(new Error(labels.attachmentRequired));
          return;
        }
        callback();
      },
      trigger: "change"
    }
  ]
};

function resetForm() {
  form.name = "";
  form.description = "";
  form.frequency = "";
  form.area_id = null;
  form.task_type = "";
  form.default_due_days = null;
  form.is_emergency_default = false;
  form.default_hazard_level = "";
  form.attachment_required = false;
  form.attachment_count = null;
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
  form.default_due_days = row.default_due_days ?? null;
  form.is_emergency_default = row.is_emergency_default ?? false;
  form.default_hazard_level = row.default_hazard_level ?? "";
  form.attachment_required = row.attachment_required ?? false;
  form.attachment_count = row.attachment_count ?? null;
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

async function fetchAreas() {
  const list = await getAreas();
  areas.value = list;
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
        default_due_days: form.default_due_days,
        is_emergency_default: form.is_emergency_default,
        default_hazard_level: form.default_hazard_level || null,
        attachment_required: form.attachment_required,
        attachment_count: form.attachment_required
          ? form.attachment_count
          : null,
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
        default_due_days: form.default_due_days,
        is_emergency_default: form.is_emergency_default,
        default_hazard_level: form.default_hazard_level || null,
        attachment_required: form.attachment_required,
        attachment_count: form.attachment_required
          ? form.attachment_count
          : null,
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
    message("?????????????????????", { type: "warning" });
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
  await fetchTemplates();
});
</script>

<template>
  <div class="p-4">
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

      <el-table :data="templates" border :loading="loading" style="width: 100%">
        <el-table-column prop="name" :label="labels.name" min-width="200" />
        <el-table-column
          prop="description"
          :label="labels.description"
          min-width="240"
        />
        <el-table-column :label="labels.frequency" width="120">
          <template #default="{ row }">
            {{
              frequencyOptions.find(opt => opt.value === row.frequency)
                ?.label ?? row.frequency
            }}
          </template>
        </el-table-column>
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
        <el-table-column :label="labels.defaultDue" width="140">
          <template #default="{ row }">
            {{
              row.default_due_days
                ? `${row.default_due_days}${labels.day}`
                : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column :label="labels.defaultEmergency" width="100">
          <template #default="{ row }">
            {{ row.is_emergency_default ? labels.yes : labels.no }}
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
        <el-table-column :label="labels.attachment" min-width="140">
          <template #default="{ row }">
            {{
              row.attachment_required
                ? `${labels.required} ${row.attachment_count ?? 0} ${labels.sheet}`
                : labels.notRequired
            }}
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
        <el-form-item :label="labels.defaultDue">
          <div class="flex items-center gap-2">
            <el-input-number v-model="form.default_due_days" :min="1" />
            <span class="text-gray-500 text-sm">{{ labels.day }}</span>
          </div>
        </el-form-item>
        <el-form-item :label="labels.defaultEmergency">
          <el-switch v-model="form.is_emergency_default" />
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
        <el-form-item :label="labels.attachment" prop="attachment_count">
          <div class="flex items-center gap-2">
            <el-switch v-model="form.attachment_required" />
            <el-input-number
              v-model="form.attachment_count"
              :min="1"
              :disabled="!form.attachment_required"
            />
            <span class="text-gray-500 text-sm">{{ labels.sheet }}</span>
          </div>
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
