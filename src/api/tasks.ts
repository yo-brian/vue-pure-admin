import { http } from "@/utils/http";

export type TaskType = "scheduled" | "adhoc";
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "under_review"
  | "closed";

export type Task = {
  id: number;
  task_type: TaskType;
  title: string;
  description?: string | null;
  equipment_name?: string | null;
  equipment_code?: string | null;
  area: number;
  template: number | null;
  custom_check_items?: string[];
  assignee: number;
  assignee_name?: string | null;
  due_date: string;
  planned_date?: string | null;
  status: TaskStatus;
  is_emergency: boolean;
  created_by: number;
  reported_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskItemRecordResult = "normal" | "abnormal" | "not_applicable";

export type TaskItemRecordImage = {
  id: number;
  task_item_record: number;
  image: string;
  created_at: string;
};

export type TaskItemRecord = {
  id: number;
  task: number;
  check_item: number | null;
  custom_name: string | null;
  result: TaskItemRecordResult | null;
  comment: string | null;
  images?: TaskItemRecordImage[];
};

export type TaskDetail = Task & {
  item_records: TaskItemRecord[];
};

export type TaskListParams = Partial<{
  task_type: TaskType;
  status: TaskStatus;
  assignee: number;
  is_emergency: boolean;
  planned_date_start: string;
  planned_date_end: string;
  all: boolean;
  page: number;
  page_size: number;
}>;

export type TaskListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Task[];
};

export function getTasks(params?: TaskListParams) {
  return http.get<Task[] | TaskListResponse, TaskListParams>("/tasks/", {
    params
  });
}

export function getTaskDetail(id: number) {
  return http.get<TaskDetail, any>(`/tasks/${id}/`);
}

export function submitTaskResults(
  id: number,
  payload: {
    records: Array<{
      task_item_record_id: number;
      result: TaskItemRecordResult;
      comment?: string | null;
    }>;
  }
) {
  return http.post<TaskDetail, any>(`/tasks/${id}/submit-results/`, {
    data: payload
  });
}

export function createAdhocTask(payload: {
  task_type?: TaskType;
  title: string;
  description?: string | null;
  equipment_name?: string | null;
  equipment_code?: string | null;
  area_id: number;
  template_id?: number | null;
  assignee_id: number;
  due_date: string;
  planned_date?: string | null;
  is_emergency?: boolean;
  custom_check_items?: string[];
}) {
  return http.post<TaskDetail, any>("/tasks/create-adhoc/", { data: payload });
}

export function updateTask(
  id: number,
  payload: Partial<{
    task_type: TaskType;
    title: string;
    description?: string | null;
    equipment_name?: string | null;
    equipment_code?: string | null;
    area: number;
    template: number | null;
    assignee: number;
    due_date: string;
    planned_date?: string | null;
    is_emergency: boolean;
    custom_check_items: string[];
  }>
) {
  return http.request<TaskDetail>("patch", `/tasks/${id}/`, { data: payload });
}

export function deleteTask(id: number) {
  return http.request<void>("delete", `/tasks/${id}/`);
}

export function batchDeleteTasks(ids: number[]) {
  return http.post<{ success: boolean; deleted: number }, any>(
    "/tasks/batch-delete/",
    { data: { ids } }
  );
}

export function uploadTaskItemRecordImage(formData: FormData) {
  return http.post<TaskItemRecordImage, any>("/task-item-record-images/", {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
}

export function deleteTaskItemRecordImage(id: number) {
  return http.request<void>("delete", `/task-item-record-images/${id}/`);
}
