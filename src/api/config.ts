import { http } from "@/utils/http";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

export type Area = {
  id: number;
  name: string;
  description?: string | null;
};

export type CheckTemplate = {
  id: number;
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  area: number | null;
  task_type: "scheduled" | "adhoc" | null;
  planned_date: string | null;
  due_date: string | null;
  status: "active" | "inactive";
  default_hazard_level: "minor" | "major" | null;
  weekly_day?: number | null;
  monthly_day?: number | null;
  yearly_month?: number | null;
  yearly_day?: number | null;
  custom_items?: string[];
};

export type TemplateScheduleConfig = {
  id: number;
  enabled: boolean;
  run_time: string;
  updated_at: string;
};

export type TemplateScheduleRunLog = {
  id: number;
  status: "success" | "failed";
  run_source: "manual" | "beat";
  started_at: string;
  finished_at: string;
  created_count: number;
  message?: string | null;
  triggered_by?: number | null;
  triggered_by_name?: string | null;
  created_at: string;
};

export type TemplateScheduleRunParams = {
  template_ids: number[];
  assignee_ids?: number[];
  start_date: string;
  end_date: string;
};

export type CheckItem = {
  id: number;
  template: number;
  name: string;
  description: string;
  group_name?: string | null;
  sort_order?: number;
  default_result?: "normal" | "abnormal" | "not_applicable" | null;
  remark_hint?: string | null;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function unwrapPaginated<T>(data: T[] | PaginatedResponse<T>) {
  return Array.isArray(data) ? data : data.results;
}

/** 获取区域列表（用于展示区域名称、以及创建临时任务的下拉选择） */
export function getAreas() {
  return http
    .get<Area[] | PaginatedResponse<Area>, any>("/areas/", {
      params: { page_size: 100 }
    })
    .then(unwrapPaginated);
}

export function createArea(payload: {
  name: string;
  description?: string | null;
}) {
  return http.post<Area, any>("/areas/", { data: payload });
}

export function updateArea(
  id: number,
  payload: Partial<{ name: string; description?: string | null }>
) {
  return http.request<Area>("patch", `/areas/${id}/`, { data: payload });
}

export function deleteArea(id: number) {
  return http.request<void>("delete", `/areas/${id}/`);
}

/** 获取模板列表（创建临时任务时可选） */
export function getTemplates() {
  return http
    .get<
      CheckTemplate[] | PaginatedResponse<CheckTemplate>,
      any
    >("/templates/", { params: { page_size: 100 } })
    .then(unwrapPaginated);
}

export function createTemplate(payload: {
  name: string;
  description?: string;
  frequency: CheckTemplate["frequency"];
  area?: number | null;
  task_type?: CheckTemplate["task_type"];
  planned_date?: string | null;
  due_date?: string | null;
  status?: CheckTemplate["status"];
  default_hazard_level?: CheckTemplate["default_hazard_level"];
  weekly_day?: number | null;
  monthly_day?: number | null;
  yearly_month?: number | null;
  yearly_day?: number | null;
  custom_items?: string[];
}) {
  return http.post<CheckTemplate, any>("/templates/", { data: payload });
}

export function updateTemplate(
  id: number,
  payload: Partial<{
    name: string;
    description?: string;
    frequency: CheckTemplate["frequency"];
    area?: number | null;
    task_type?: CheckTemplate["task_type"];
    planned_date?: string | null;
    due_date?: string | null;
    status?: CheckTemplate["status"];
    default_hazard_level?: CheckTemplate["default_hazard_level"];
    weekly_day?: number | null;
    monthly_day?: number | null;
    yearly_month?: number | null;
    yearly_day?: number | null;
    custom_items?: string[];
  }>
) {
  return http.request<CheckTemplate>("patch", `/templates/${id}/`, {
    data: payload
  });
}

export function deleteTemplate(id: number) {
  return http.request<void>("delete", `/templates/${id}/`);
}

/** 获取检查项列表（任务详情用于把 check_item id 映射为名称） */
export function getCheckItems() {
  return http
    .get<CheckItem[] | PaginatedResponse<CheckItem>, any>("/check-items/", {
      params: { page_size: 100 }
    })
    .then(unwrapPaginated);
}

export function getTemplateScheduleConfig() {
  return http.get<TemplateScheduleConfig, any>("/template-schedule-config/");
}

export function updateTemplateScheduleConfig(
  payload: Partial<{ enabled: boolean; run_time: string }>
) {
  return http.post<TemplateScheduleConfig, any>("/template-schedule-config/", {
    data: payload
  });
}

export function getTemplateScheduleLogs(limit = 10) {
  return http.get<TemplateScheduleRunLog[], any>("/template-schedule-logs/", {
    params: { limit }
  });
}

export function runTemplateScheduleNow(
  payload: TemplateScheduleRunParams,
  config?: PureHttpRequestConfig
) {
  return http.post<TemplateScheduleRunLog, any>(
    "/template-schedule-run/",
    {
      data: payload
    },
    config
  );
}
