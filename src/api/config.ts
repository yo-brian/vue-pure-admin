import { http } from "@/utils/http";

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
};

export type CheckItem = {
  id: number;
  template: number;
  name: string;
  description: string;
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
}) {
  return http.post<CheckTemplate, any>("/templates/", { data: payload });
}

export function updateTemplate(
  id: number,
  payload: Partial<{
    name: string;
    description?: string;
    frequency: CheckTemplate["frequency"];
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
