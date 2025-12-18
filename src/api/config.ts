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

/** 获取区域列表（用于展示区域名称、以及创建临时任务的下拉选择） */
export function getAreas() {
  return http.get<Area[], any>("/areas/");
}

/** 获取模板列表（创建临时任务时可选） */
export function getTemplates() {
  return http.get<CheckTemplate[], any>("/templates/");
}

/** 获取检查项列表（任务详情用于把 check_item id 映射为名称） */
export function getCheckItems() {
  return http.get<CheckItem[], any>("/check-items/");
}

