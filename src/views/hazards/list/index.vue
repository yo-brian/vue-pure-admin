<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import dayjs from "dayjs";
import type { FormInstance } from "element-plus";
import { message } from "@/utils/message";
import { getAreas } from "@/api/config";
import {
  getHazards,
  transitionHazardStatus,
  updateHazard,
  exportHazardReport,
  type Hazard,
  type HazardLevel,
  type HazardStatus
} from "@/api/hazards";
import { getUsers, type AppUser } from "@/api/user";

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

const editDialogVisible = ref(false);
const editSubmitting = ref(false);
const editFormRef = ref<FormInstance>();
const users = ref<AppUser[]>([]);

const editForm = reactive({
  id: 0,
  title: "",
  description: "",
  level: "minor" as HazardLevel,
  status: "to_fix" as HazardStatus,
  area: 0,
  department: "",
  responsible: null as number | null,
  responsible_users: [] as number[],
  maintenance_type: "",
  cost: null as number | null,
  approver: null as number | null,
  acceptance_time: "" as string | null,
  acceptance_user: null as number | null,
  equipment_name: "",
  equipment_code: "",
  due_date: "" as string | null
});

const transitionLoading = reactive<Record<number, boolean>>({});
const pagination = ref({ current: 1, pageSize: 10, total: 0 });

const statusOptions: Array<{ label: string; value: HazardStatus }> = [
  { label: "\u5f85\u6574\u6539", value: "to_fix" },
  { label: "\u6574\u6539\u4e2d", value: "fixing" },
  { label: "\u5f85\u590d\u67e5", value: "to_review" },
  { label: "\u5df2\u5173\u95ed", value: "closed" }
];

const levelOptions: Array<{ label: string; value: HazardLevel }> = [
  { label: "\u4e00\u822c", value: "minor" },
  { label: "\u91cd\u5927", value: "major" }
];

const detailLabels = {
  equipmentName: "\u8bbe\u5907\u540d\u79f0",
  equipmentCode: "\u8bbe\u5907\u7f16\u53f7",
  maintenanceType: "\u7ef4\u4fee/\u4fdd\u517b",
  cost: "\u8d39\u7528",
  approver: "\u5ba1\u6279\u4eba",
  acceptanceTime: "\u9a8c\u6536\u65f6\u95f4",
  acceptanceUser: "\u9a8c\u6536\u4eba",
  responsibleUsers: "\u8d23\u4efb\u4eba(\u591a\u4eba)"
};

const reporterLabel = "\u62a5\u544a\u4eba";

const actionLabels = {
  action: "\u64cd\u4f5c",
  view: "\u67e5\u770b",
  edit: "\u7f16\u8f91",
  toReview: "\u8f6c\u5f85\u590d\u67e5",
  close: "\u5173\u95ed",
  closeConfirm: "\u786e\u8ba4\u5173\u95ed\u8be5\u9690\u60a3\u5417\uff1f",
  export: "\u5bfc\u51fa\u62a5\u544a"
};

const editLabels = {
  dialogTitle: "\u9690\u60a3\u7f16\u8f91",
  title: "\u6807\u9898",
  description: "\u63cf\u8ff0",
  level: "\u7b49\u7ea7",
  status: "\u72b6\u6001",
  area: "\u533a\u57df",
  department: "\u90e8\u95e8",
  dueDate: "\u6574\u6539\u671f\u9650",
  responsible: "\u62a5\u544a\u4eba",
  responsibleUsers: "\u8d23\u4efb\u4eba(\u591a\u4eba)",
  maintenanceType: "\u7ef4\u4fee/\u4fdd\u517b",
  cost: "\u8d39\u7528",
  approver: "\u5ba1\u6279\u4eba",
  acceptanceTime: "\u9a8c\u6536\u65f6\u95f4",
  acceptanceUser: "\u9a8c\u6536\u4eba",
  equipmentName: "\u8bbe\u5907\u540d\u79f0",
  equipmentCode: "\u8bbe\u5907\u7f16\u53f7",
  selectPlaceholder: "\u8bf7\u9009\u62e9",
  maintenancePlaceholder: "\u5982\uff1a\u7ef4\u4fee/\u4fdd\u517b",
  cancel: "\u53d6\u6d88",
  save: "\u4fdd\u5b58"
};

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

function userDisplayName(user: AppUser) {
  const fullName = `${user.first_name ?? ""}${user.last_name ?? ""}`.trim();
  return fullName || user.username;
}

const userNameMap = computed(() =>
  Object.fromEntries(users.value.map(user => [user.id, userDisplayName(user)]))
);

function userNameById(id?: number | null) {
  if (!id) return "-";
  return userNameMap.value[id] ?? `#${id}`;
}

function userNamesByIds(ids?: number[] | null) {
  if (!ids?.length) return "-";
  return ids.map(id => userNameMap.value[id] ?? `#${id}`).join(", ");
}

function openDetail(row: Hazard) {
  currentHazard.value = row;
  dialogVisible.value = true;
}

function openEdit(row: Hazard) {
  editForm.id = row.id;
  editForm.title = row.title ?? "";
  editForm.description = row.description ?? "";
  editForm.level = row.level;
  editForm.status = row.status;
  editForm.area = row.area;
  editForm.department = row.department ?? "";
  editForm.responsible = row.responsible ?? null;
  editForm.responsible_users = row.responsible_users
    ? [...row.responsible_users]
    : [];
  editForm.maintenance_type = row.maintenance_type ?? "";
  editForm.cost = row.cost ? Number(row.cost) : null;
  editForm.approver = row.approver ?? null;
  editForm.acceptance_time = row.acceptance_time ?? null;
  editForm.acceptance_user = row.acceptance_user ?? null;
  editForm.equipment_name = row.equipment_name ?? "";
  editForm.equipment_code = row.equipment_code ?? "";
  editForm.due_date = row.due_date ?? null;
  editDialogVisible.value = true;
}

async function handleUpdate() {
  if (!editForm.id) return;
  editSubmitting.value = true;
  try {
    await updateHazard(editForm.id, {
      title: editForm.title,
      description: editForm.description,
      level: editForm.level,
      status: editForm.status,
      area: editForm.area,
      department: editForm.department || null,
      responsible: editForm.responsible || null,
      responsible_users: editForm.responsible_users,
      maintenance_type: editForm.maintenance_type || null,
      cost: editForm.cost,
      approver: editForm.approver || null,
      acceptance_time: editForm.acceptance_time || null,
      acceptance_user: editForm.acceptance_user || null,
      equipment_name: editForm.equipment_name || null,
      equipment_code: editForm.equipment_code || null,
      due_date: editForm.due_date || null
    });
    message("\u66f4\u65b0\u6210\u529f", { type: "success" });
    editDialogVisible.value = false;
    await fetchHazards();
  } finally {
    editSubmitting.value = false;
  }
}

async function fetchAreas() {
  const list = await getAreas();
  areaNameMap.value = Object.fromEntries(list.map(x => [x.id, x.name]));
}

async function fetchUsers() {
  users.value = await getUsers();
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

async function handleExport(row: Hazard) {
  try {
    const blob = await exportHazardReport(row.id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `????_${row.id}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    // ?????????
  }
}

async function handleTransition(row: Hazard, status: "to_review" | "closed") {
  transitionLoading[row.id] = true;
  try {
    await transitionHazardStatus(row.id, status);
    message("\u72b6\u6001\u66f4\u65b0\u6210\u529f", { type: "success" });
    await fetchHazards();
  } finally {
    transitionLoading[row.id] = false;
  }
}

onMounted(async () => {
  await fetchAreas();
  await fetchUsers();
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
        <el-table-column :label="reporterLabel" width="140">
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
        <el-table-column :label="actionLabels.action" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">
              {{ actionLabels.view }}
            </el-button>
            <el-button link type="primary" @click="openEdit(row)">
              {{ actionLabels.edit }}
            </el-button>
            <el-button
              v-if="row.status !== 'to_review' && row.status !== 'closed'"
              link
              type="warning"
              :loading="transitionLoading[row.id]"
              @click="handleTransition(row, 'to_review')"
            >
              {{ actionLabels.toReview }}
            </el-button>
            <el-button link type="primary" @click="handleExport(row)">
              {{ actionLabels.export }}
            </el-button>
            <el-popconfirm
              :title="actionLabels.closeConfirm"
              @confirm="handleTransition(row, 'closed')"
            >
              <template #reference>
                <el-button
                  v-if="row.status !== 'closed'"
                  link
                  type="danger"
                  :loading="transitionLoading[row.id]"
                >
                  {{ actionLabels.close }}
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
          <el-descriptions-item :label="reporterLabel">
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
          <el-descriptions-item :label="detailLabels.equipmentName">
            {{ currentHazard.equipment_name ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="detailLabels.equipmentCode">
            {{ currentHazard.equipment_code ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="detailLabels.maintenanceType">
            {{ currentHazard.maintenance_type ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="detailLabels.cost">
            {{ currentHazard.cost ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item :label="detailLabels.approver">
            {{ userNameById(currentHazard.approver) }}
          </el-descriptions-item>
          <el-descriptions-item :label="detailLabels.acceptanceTime">
            {{
              currentHazard.acceptance_time
                ? dayjs(currentHazard.acceptance_time).format(
                    "YYYY-MM-DD HH:mm"
                  )
                : "-"
            }}
          </el-descriptions-item>
          <el-descriptions-item :label="detailLabels.acceptanceUser">
            {{ userNameById(currentHazard.acceptance_user) }}
          </el-descriptions-item>
          <el-descriptions-item
            :label="detailLabels.responsibleUsers"
            :span="2"
          >
            {{ userNamesByIds(currentHazard.responsible_users) }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      :title="editLabels.dialogTitle"
      width="1200px"
    >
      <el-form ref="editFormRef" :model="editForm" label-width="110px">
        <el-form-item :label="editLabels.title">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item :label="editLabels.description">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item :label="editLabels.level">
          <el-select
            v-model="editForm.level"
            :placeholder="editLabels.selectPlaceholder"
          >
            <el-option
              v-for="opt in levelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="editLabels.status">
          <el-select
            v-model="editForm.status"
            :placeholder="editLabels.selectPlaceholder"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="editLabels.area">
          <el-select
            v-model="editForm.area"
            :placeholder="editLabels.selectPlaceholder"
            filterable
          >
            <el-option
              v-for="(name, id) in areaNameMap"
              :key="id"
              :label="name"
              :value="Number(id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="editLabels.department">
          <el-input v-model="editForm.department" />
        </el-form-item>
        <el-form-item :label="editLabels.dueDate">
          <el-date-picker
            v-model="editForm.due_date"
            type="date"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item :label="editLabels.responsible">
          <el-select
            v-model="editForm.responsible"
            :placeholder="editLabels.selectPlaceholder"
            clearable
            filterable
          >
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="userDisplayName(u)"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="editLabels.responsibleUsers">
          <el-select
            v-model="editForm.responsible_users"
            multiple
            :placeholder="editLabels.selectPlaceholder"
            filterable
          >
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="userDisplayName(u)"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="editLabels.maintenanceType">
          <el-input
            v-model="editForm.maintenance_type"
            :placeholder="editLabels.maintenancePlaceholder"
          />
        </el-form-item>
        <el-form-item :label="editLabels.cost">
          <el-input-number
            v-model="editForm.cost"
            :min="0"
            :step="1"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item :label="editLabels.approver">
          <el-select
            v-model="editForm.approver"
            :placeholder="editLabels.selectPlaceholder"
            clearable
            filterable
          >
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="userDisplayName(u)"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="editLabels.acceptanceTime">
          <el-date-picker
            v-model="editForm.acceptance_time"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item :label="editLabels.acceptanceUser">
          <el-select
            v-model="editForm.acceptance_user"
            :placeholder="editLabels.selectPlaceholder"
            clearable
            filterable
          >
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="userDisplayName(u)"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="editLabels.equipmentName">
          <el-input v-model="editForm.equipment_name" />
        </el-form-item>
        <el-form-item :label="editLabels.equipmentCode">
          <el-input v-model="editForm.equipment_code" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="editDialogVisible = false">{{
            editLabels.cancel
          }}</el-button>
          <el-button
            type="primary"
            :loading="editSubmitting"
            @click="handleUpdate"
          >
            {{ editLabels.save }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
