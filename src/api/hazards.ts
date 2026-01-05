import { http } from "@/utils/http";

export type HazardLevel = "minor" | "major";
export type HazardStatus = "to_fix" | "fixing" | "to_review" | "closed";

export type HazardTaskItemRecordImage = {
  id: number;
  task_item_record: number;
  image: string;
  created_at: string;
};

export type HazardRectificationImage = {
  id: number;
  hazard: number;
  image: string;
  created_at: string;
};

export type Hazard = {
  id: number;
  task: number;
  task_item_record: number | null;
  is_emergency?: boolean;
  check_item_name?: string | null;
  task_item_record_images?: HazardTaskItemRecordImage[];
  rectification_images?: HazardRectificationImage[];
  area_name?: string | null;
  task_title?: string | null;
  level_display?: string | null;
  status_display?: string | null;
  title: string;
  description: string;
  level: HazardLevel;
  area: number;
  responsible: number | null;
  responsible_users?: number[];
  responsible_user_names?: string[];
  responsible_department?: string | null;
  responsible_name?: string | null;
  responsible_full_name?: string | null;
  approver_name?: string | null;
  approver_full_name?: string | null;
  acceptance_user_name?: string | null;
  maintenance_type?: string | null;
  cost?: string | number | null;
  approver?: number | null;
  approval_comment?: string | null;
  acceptance_time?: string | null;
  acceptance_user?: number | null;
  equipment_name?: string | null;
  equipment_code?: string | null;
  due_date: string | null;
  planned_date?: string | null;
  status: HazardStatus;
  created_at: string;
  updated_at: string;
};

export type HazardListParams = Partial<{
  status: HazardStatus;
  level: HazardLevel;
  area: number;
  responsible: number;
  keyword: string;
  page: number;
  page_size: number;
  task: number;
  due_from: string;
  due_to: string;
}>;

export type HazardListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Hazard[];
};

export function getHazards(params?: HazardListParams) {
  return http.get<Hazard[] | HazardListResponse, HazardListParams>(
    "/hazards/",
    {
      params
    }
  );
}

export function transitionHazardStatus(
  id: number,
  status: "to_review" | "closed"
) {
  return http.post<Hazard, any>(`/hazards/${id}/transition-status/`, {
    data: { status }
  });
}

export function exportHazardReport(id: number, format: "pdf" | "xlsx" = "pdf") {
  return http.request<Blob>("get", `/hazards/${id}/export-report/`, {
    params: { file_format: format },
    responseType: "blob"
  } as any);
}

export function updateHazard(
  id: number,
  payload: Partial<{
    title: string;
    description: string;
    area: number;
    responsible?: number | null;
    maintenance_type?: string | null;
    cost?: number | string | null;
    approver?: number | null;
    approval_comment?: string | null;
    equipment_name?: string | null;
    equipment_code?: string | null;
    due_date?: string | null;
    status?: HazardStatus;
    is_emergency?: boolean;
  }>
) {
  return http.request<Hazard>("patch", `/hazards/${id}/`, { data: payload });
}

export function uploadHazardRectificationImage(formData: FormData) {
  return http.request<HazardRectificationImage>(
    "post",
    "/hazard-rectification-images/",
    {
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );
}

export function deleteHazardRectificationImage(id: number) {
  return http.request("delete", `/hazard-rectification-images/${id}/`);
}
