<script setup lang="ts">
/**
 * 新建临时任务页面
 * - 区域、模板从后端接口拉取
 * - 执行人可先简化为输入 userId
 * - 未选择模板时，必须填写至少 1 条自定义检查项
 */
import { computed, onMounted, reactive, ref } from "vue";
import dayjs from "dayjs";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import { useRouter } from "vue-router";
import { createAdhocTask } from "@/api/tasks";
import { getAreas, getTemplates, type Area, type CheckTemplate } from "@/api/config";

const router = useRouter();

const loading = ref(false);
const submitting = ref(false);

const areas = ref<Area[]>([]);
const templates = ref<CheckTemplate[]>([]);

const formRef = ref<FormInstance>();

const form = reactive<{
  title: string;
  area_id: number | null;
  template_id: number | null;
  assignee_id: number | null;
  due_date: string | null;
  is_emergency: boolean;
  custom_check_items: string[];
}>({
  title: "",
  area_id: null,
  template_id: null,
  assignee_id: null,
  due_date: null,
  is_emergency: false,
  custom_check_items: []
});

const newCheckItem = ref("");

const isUsingTemplate = computed(() => !!form.template_id);

const rules: FormRules = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  area_id: [{ required: true, message: "请选择区域", trigger: "change" }],
  assignee_id: [{ required: true, message: "请输入执行人 ID", trigger: "blur" }],
  due_date: [{ required: true, message: "请选择截止日期", trigger: "change" }],
  custom_check_items: [
    {
      validator: (_rule, _value, callback) => {
        // 未选择模板时必须有自定义检查项
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

async function fetchOptions() {
  loading.value = true;
  try {
    const [areasRes, templatesRes] = await Promise.all([
      getAreas(),
      getTemplates()
    ]);
    areas.value = areasRes;
    templates.value = templatesRes;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) return;

  submitting.value = true;
  try {
    await createAdhocTask({
      title: form.title,
      area_id: form.area_id!,
      template_id: form.template_id || null,
      assignee_id: form.assignee_id!,
      due_date: dayjs(form.due_date!).format("YYYY-MM-DD"),
      is_emergency: form.is_emergency,
      custom_check_items: form.custom_check_items
    });
    message("创建成功", { type: "success" });
    router.push("/tasks/my");
  } finally {
    submitting.value = false;
  }
}

onMounted(fetchOptions);
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" :loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">新建临时任务</span>
          <el-button @click="router.push('/tasks/all')">返回</el-button>
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

        <el-form-item label="执行人 ID" prop="assignee_id">
          <el-input-number v-model="form.assignee_id" :min="1" />
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
          <el-button
            type="primary"
            :loading="submitting"
            @click="handleSubmit"
          >
            创建临时任务
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
