<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import {
  createArea,
  deleteArea,
  getAreas,
  type Area,
  updateArea
} from "@/api/config";

const loading = ref(false);
const submitting = ref(false);
const areas = ref<Area[]>([]);

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstance>();
const form = reactive<{ name: string; description: string | null }>({
  name: "",
  description: null
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入区域名称", trigger: "blur" }]
};

function resetForm() {
  form.name = "";
  form.description = null;
  formRef.value?.clearValidate();
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: Area) {
  isEdit.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.description = row.description ?? null;
  dialogVisible.value = true;
}

async function fetchAreas() {
  loading.value = true;
  try {
    areas.value = await getAreas();
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
      await updateArea(editingId.value, {
        name: form.name,
        description: form.description
      });
      message("更新成功", { type: "success" });
    } else {
      await createArea({
        name: form.name,
        description: form.description
      });
      message("新增成功", { type: "success" });
    }
    dialogVisible.value = false;
    await fetchAreas();
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: Area) {
  await deleteArea(row.id);
  message("删除成功", { type: "success" });
  await fetchAreas();
}

onMounted(fetchAreas);
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">检查区域</span>
          <div class="flex items-center gap-2">
            <el-button :loading="loading" @click="fetchAreas">刷新</el-button>
            <el-button type="primary" @click="openCreate">新增区域</el-button>
          </div>
        </div>
      </template>

      <el-table :data="areas" border :loading="loading" style="width: 100%">
        <el-table-column prop="name" label="区域名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="240" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-popconfirm
              title="确认删除该区域吗？"
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
      :title="isEdit ? '编辑区域' : '新增区域'"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入区域名称" />
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
