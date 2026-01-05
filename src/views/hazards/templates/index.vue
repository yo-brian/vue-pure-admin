<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { message } from "@/utils/message";
import HtmlEditor from "@/components/HtmlEditor.vue";
import {
  createHazardReportTemplate,
  getHazardReportTemplates,
  updateHazardReportTemplate,
  type HazardReportTemplate
} from "@/api/hazardTemplates";
import { getHazards, type Hazard } from "@/api/hazards";

const loading = ref(false);
const templates = ref<HazardReportTemplate[]>([]);
const selectedId = ref<number | null>(null);
const latestHazard = ref<Hazard | null>(null);

const form = reactive({
  id: 0,
  name: "\u6807\u51c6\u7248",
  description: "",
  is_default: true,
  page_size: "A4" as "A4" | "A5"
});

const labels = {
  title: "\u9690\u60a3\u6a21\u677f",
  select: "\u9009\u62e9\u6a21\u677f",
  name: "\u6a21\u677f\u540d",
  isDefault: "\u9ed8\u8ba4\u6a21\u677f",
  description: "\u6a21\u677f\u8bf4\u660e",
  pageSize: "\u753b\u5e03\u5927\u5c0f",
  pageOrientation: "\u65b9\u5411",
  create: "\u65b0\u5efa\u6a21\u677f",
  save: "\u4fdd\u5b58",
  print: "\u6253\u5370\u9884\u89c8",
  placeholders: "\u5360\u4f4d\u7b26"
};

const pageSize = ref<"A4" | "A5">("A4");
const pageOrientation = ref<"portrait" | "landscape">("portrait");
const orientationOptions = [
  { label: "\u7ad6\u5411", value: "portrait" },
  { label: "\u6a2a\u5411", value: "landscape" }
];
const pageStyles = computed(() =>
  (() => {
    const base =
      pageSize.value === "A5"
        ? { width: 559, height: 794 }
        : { width: 794, height: 1123 };
    if (pageOrientation.value === "landscape") {
      return { width: `${base.height}px`, height: `${base.width}px` };
    }
    return { width: `${base.width}px`, height: `${base.height}px` };
  })()
);
watch(pageSize, value => {
  form.page_size = value;
});

const placeholders = [
  "{\u9690\u60a3ID}",
  "{\u6807\u9898}",
  "{\u63cf\u8ff0}",
  "{\u7b49\u7ea7}",
  "{\u72b6\u6001}",
  "{\u533a\u57df}",
  "{\u4efb\u52a1ID}",
  "{\u4efb\u52a1\u6807\u9898}",
  "{\u68c0\u67e5\u9879}",
  "{\u6574\u6539\u524d\u7167\u7247}",
  "{\u6574\u6539\u540e\u7167\u7247}",
  "{\u8bbe\u5907\u540d\u79f0}",
  "{\u8bbe\u5907\u7f16\u53f7}",
  "{\u6267\u884c\u4eba}",
  "{\u6267\u884c\u4eba\u5217\u8868}",
  "{\u90e8\u95e8}",
  "{\u7ef4\u4fee/\u4fdd\u517b}",
  "{\u8d39\u7528}",
  "{\u5ba1\u6279\u4eba}",
  "{\u9a8c\u6536\u65f6\u95f4}",
  "{\u9a8c\u6536\u4eba}",
  "{\u6574\u6539\u671f\u9650}",
  "{\u521b\u5efa\u65f6\u95f4}",
  "{\u751f\u6210\u65f6\u95f4}"
];

function copyPlaceholder(value: string) {
  navigator.clipboard.writeText(value).then(
    () => message("\u5df2\u590d\u5236", { type: "success" }),
    () => message("\u590d\u5236\u5931\u8d25", { type: "error" })
  );
}

const templateOptions = computed(() =>
  templates.value.map(item => ({
    label: item.name,
    value: item.id
  }))
);

function applyTemplate(item: HazardReportTemplate | null) {
  if (!item) return;
  form.id = item.id;
  form.name = item.name ?? "";
  form.description = item.description ?? "";
  form.is_default = item.is_default ?? false;
  form.page_size = item.page_size === "A5" ? "A5" : "A4";
  pageSize.value = form.page_size;
  selectedId.value = item.id;
}

function resetForm() {
  form.id = 0;
  form.name = "\u6807\u51c6\u7248";
  form.description = "";
  form.is_default = true;
  form.page_size = "A4";
  pageSize.value = "A4";
  selectedId.value = null;
}

async function fetchLatestHazard() {
  try {
    const res = await getHazards({ page: 1, page_size: 1 });
    const list = Array.isArray(res) ? res : res.results;
    latestHazard.value = list[0] ?? null;
  } catch (error) {
    latestHazard.value = null;
  }
}

async function fetchTemplates() {
  loading.value = true;
  try {
    templates.value = await getHazardReportTemplates();
    const defaultItem =
      templates.value.find(item => item.is_default) || templates.value[0];
    if (defaultItem) {
      applyTemplate(defaultItem);
    } else {
      resetForm();
    }
  } finally {
    loading.value = false;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value?: string | null, dateOnly = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateOnly
    ? date.toLocaleDateString("zh-CN")
    : date.toLocaleString("zh-CN");
}

function resolveImageUrl(src: string) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

function renderPhotoBlock(images?: Array<{ image: string }>) {
  const list = (images || [])
    .map(item => resolveImageUrl(item.image))
    .filter(Boolean)
    .slice(0, 3);
  if (!list.length) return "-";
  return `<div class="photo-grid">${list
    .map(src => `<img src="${escapeHtml(src)}" />`)
    .join("")}</div>`;
}

function renderPreviewHtml() {
  if (!latestHazard.value) {
    return form.description || "";
  }
  const hazard = latestHazard.value;
  const descriptionHtml = hazard?.description || "-";
  const replacements: Record<string, string> = {
    "{\u9690\u60a3ID}": String(hazard.id),
    "{\u6807\u9898}": escapeHtml(hazard.title || "-"),
    "{\u63cf\u8ff0}": descriptionHtml,
    "{\u7b49\u7ea7}": escapeHtml(hazard.level_display || hazard.level || "-"),
    "{\u72b6\u6001}": escapeHtml(hazard.status_display || hazard.status || "-"),
    "{\u533a\u57df}": escapeHtml(hazard.area_name || "-"),
    "{\u4efb\u52a1ID}": escapeHtml(hazard.task ? String(hazard.task) : "-"),
    "{\u4efb\u52a1\u6807\u9898}": escapeHtml(hazard.task_title || "-"),
    "{\u68c0\u67e5\u9879}": escapeHtml(hazard.check_item_name || "-"),
    "{\u6574\u6539\u524d\u7167\u7247}": renderPhotoBlock(
      hazard.task_item_record_images
    ),
    "{\u6574\u6539\u540e\u7167\u7247}": renderPhotoBlock(
      hazard.rectification_images
    ),
    "{\u8bbe\u5907\u540d\u79f0}": escapeHtml(hazard.equipment_name || "-"),
    "{\u8bbe\u5907\u7f16\u53f7}": escapeHtml(hazard.equipment_code || "-"),
    "{\u8d23\u4efb\u4eba}": escapeHtml(
      hazard.responsible_full_name || hazard.responsible_name || "-"
    ),
    "{\u6267\u884c\u4eba}": escapeHtml(
      hazard.responsible_full_name || hazard.responsible_name || "-"
    ),
    "{\u8d23\u4efb\u4eba\u5217\u8868}": escapeHtml(
      (hazard.responsible_user_names || []).join(", ") || "-"
    ),
    "{\u6267\u884c\u4eba\u5217\u8868}": escapeHtml(
      (hazard.responsible_user_names || []).join(", ") || "-"
    ),
    "{\u90e8\u95e8}": escapeHtml(hazard.responsible_department || "-"),
    "{\u7ef4\u4fee/\u4fdd\u517b}": escapeHtml(hazard.maintenance_type || "-"),
    "{\u8d39\u7528}": escapeHtml(
      hazard.cost == null || hazard.cost === "" ? "-" : String(hazard.cost)
    ),
    "{\u5ba1\u6279\u4eba}": escapeHtml(
      hazard.approver_full_name || hazard.approver_name || "-"
    ),
    "{\u9a8c\u6536\u65f6\u95f4}": escapeHtml(
      formatDate(hazard.acceptance_time, true)
    ),
    "{\u9a8c\u6536\u4eba}": escapeHtml(hazard.acceptance_user_name || "-"),
    "{\u6574\u6539\u671f\u9650}": escapeHtml(formatDate(hazard.due_date, true)),
    "{\u521b\u5efa\u65f6\u95f4}": escapeHtml(formatDate(hazard.created_at)),
    "{\u751f\u6210\u65f6\u95f4}": escapeHtml(
      formatDate(new Date().toISOString())
    )
  };

  let rendered = form.description || "";
  Object.entries(replacements).forEach(([key, value]) => {
    rendered = rendered.split(key).join(value);
  });
  return rendered;
}

function renderApprovalFooterHtml() {
  const hazard = latestHazard.value;
  const approverName =
    hazard?.approver_full_name || hazard?.approver_name || "-";
  const comment = hazard?.approval_comment || "-";
  return `
    <span>审批人：${escapeHtml(approverName)}</span>
    <span>审批意见：${escapeHtml(comment)}</span>
    <span>审批日期：-</span>
  `;
}

async function handleSave() {
  if (!form.name.trim()) {
    message("\u8bf7\u586b\u5199\u6a21\u677f\u540d", { type: "warning" });
    return;
  }
  if (form.id) {
    await updateHazardReportTemplate(form.id, {
      name: form.name,
      description: form.description || null,
      is_default: form.is_default,
      page_size: pageSize.value
    });
  } else {
    const created = await createHazardReportTemplate({
      name: form.name,
      description: form.description || null,
      is_default: form.is_default,
      page_size: pageSize.value
    });
    form.id = created.id;
  }
  message("\u4fdd\u5b58\u6210\u529f", { type: "success" });
  await fetchTemplates();
}

function handleSelect(id: number) {
  const found = templates.value.find(item => item.id === id) || null;
  applyTemplate(found);
}

async function handlePrintPreview() {
  await fetchLatestHazard();
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    message(
      "\u8bf7\u5141\u8bb8\u5f39\u7a97\u4ee5\u6253\u5f00\u6253\u5370\u9884\u89c8",
      {
        type: "warning"
      }
    );
    return;
  }

  const size = pageSize.value;
  const orientation = pageOrientation.value;
  const pageCss = `@page { size: ${size} ${orientation}; margin: 12mm; }`;
  const pageStyle = `width: ${pageStyles.value.width}; min-height: ${pageStyles.value.height};`;

  previewWindow.document.open();
  previewWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${form.name || "Template"}</title>
    <base href="${window.location.origin}" />
    <style>
      ${pageCss}
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Microsoft YaHei", Arial, sans-serif; color: #111; }
      .page { ${pageStyle} margin: 0 auto; background: #fff; display: flex; flex-direction: column; }
      table { border-collapse: collapse; width: auto; max-width: 100%; margin: 0 auto; }
      th, td { border: 1px solid #333; padding: 6px; }
      .photo-grid { display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; margin: 6px 0; }
      .photo-grid img { max-width: 50%; max-height: 75mm; object-fit: contain; border: 1px solid #ccc; }
      .page-body { flex: 1 1 auto; }
      .approval-footer { margin-top: auto; padding-top: 8px; font-size: 16px; display: flex; justify-content: space-between; gap: 12px; }
      .approval-footer span { flex: 1 1 0; text-align: center; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="page-body">${renderPreviewHtml()}</div>
      <div class="approval-footer">${renderApprovalFooterHtml()}</div>
    </div>
    <script>
      window.onload = () => window.print();
    <\/script>
  </body>
</html>`);
  previewWindow.document.close();
}

onMounted(() => {
  fetchTemplates();
  fetchLatestHazard();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" :loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ labels.title }}</span>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-500">{{ labels.pageSize }}</span>
              <el-select v-model="pageSize" style="width: 120px">
                <el-option label="A4" value="A4" />
                <el-option label="A5" value="A5" />
              </el-select>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-500">
                {{ labels.pageOrientation }}
              </span>
              <el-select v-model="pageOrientation" style="width: 120px">
                <el-option
                  v-for="item in orientationOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>
            <el-select
              v-model="selectedId"
              :placeholder="labels.select"
              style="width: 200px"
              clearable
              @change="handleSelect"
            >
              <el-option
                v-for="item in templateOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-button @click="resetForm">{{ labels.create }}</el-button>
            <el-button @click="handlePrintPreview">
              {{ labels.print }}
            </el-button>
            <el-button type="primary" @click="handleSave">
              {{ labels.save }}
            </el-button>
          </div>
        </div>
      </template>

      <el-form label-width="120px">
        <el-form-item :label="labels.name">
          <el-input v-model="form.name" placeholder="..." />
        </el-form-item>
        <el-form-item :label="labels.isDefault">
          <el-switch v-model="form.is_default" />
        </el-form-item>
        <el-form-item :label="labels.placeholders">
          <div class="flex flex-wrap gap-2">
            <el-tag
              v-for="item in placeholders"
              :key="item"
              class="cursor-pointer"
              @click="copyPlaceholder(item)"
            >
              {{ item }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item :label="labels.description">
          <div
            class="border border-dashed border-slate-300 bg-white shadow-sm"
            :style="pageStyles"
          >
            <HtmlEditor
              v-model="form.description"
              :height="pageStyles.height"
            />
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
