<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import {
  createTemplate,
  deleteTemplate,
  getTemplates,
  type CheckTemplate,
  updateTemplate
} from "@/api/config";

const loading = ref(false);
const submitting = ref(false);
const templates = ref<CheckTemplate[]>([]);

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstance>();
const form = reactive<{
  name: string;
  description: string;
  frequency: CheckTemplate["frequency"] | "";
}>({
  name: "",
  description: "",
  frequency: ""
});

const frequencyOptions: Array<{
  label: string;
  value: CheckTemplate["frequency"];
}> = [
  { label: "每日", value: "daily" },
  { label: "每周", value: "weekly" },
  { label: "每月", value: "monthly" },
  { label: "每年", value: "yearly" }
];

const rules: FormRules = {
  name: [{ required: true, message: "请输入模板名称", trigger: "blur" }],
  frequency: [{ required: true, message: "请选择频率", trigger: "change" }]
};

function resetForm() {
  form.name = "";
  form.description = "";
  form.frequency = "";
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

async function handleSubmit() {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) return;
  submitting.value = true;
  try {
    if (isEdit.value && editingId.value) {
      await updateTemplate(editingId.value, {
        name: form.name,
        description: form.description,
        frequency: form.frequency as CheckTemplate["frequency"]
      });
      message("更新成功", { type: "success" });
    } else {
      await createTemplate({
        name: form.name,
        description: form.description,
        frequency: form.frequency as CheckTemplate["frequency"]
      });
      message("新增成功", { type: "success" });
    }
    dialogVisible.value = false;
    await fetchTemplates();
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: CheckTemplate) {
  await deleteTemplate(row.id);
  message("删除成功", { type: "success" });
  await fetchTemplates();
}

onMounted(fetchTemplates);
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">检查模板</span>
          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="fetchTemplates"
              >刷新</el-button
            >
            <el-button type="primary" @click="openCreate">新增模板</el-button>
          </div>
        </div>
      </template>

      <el-table :data="templates" border :loading="loading" style="width: 100%">
        <el-table-column prop="name" label="模板名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="240" />
        <el-table-column label="频率" width="120">
          <template #default="{ row }">
            {{
              frequencyOptions.find(opt => opt.value === row.frequency)
                ?.label ?? row.frequency
            }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-popconfirm
              title="确认删除该模板吗？"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '新增模板'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="频率" prop="frequency">
          <el-select v-model="form.frequency" placeholder="请选择频率">
            <el-option
              v-for="opt in frequencyOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="可选"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
