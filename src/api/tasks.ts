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
  area: number;
  template: number | null;
  assignee: number;
  due_date: string;
  status: TaskStatus;
  is_emergency: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type TaskItemRecordResult = "normal" | "abnormal" | "not_applicable";

export type TaskItemRecord = {
  id: number;
  task: number;
  check_item: number | null;
  custom_name: string | null;
  result: TaskItemRecordResult | null;
  comment: string | null;
};

export type TaskDetail = Task & {
  item_records: TaskItemRecord[];
};

export type TaskListParams = Partial<{
  task_type: TaskType;
  status: TaskStatus;
  assignee: number;
  is_emergency: boolean;
  all: boolean;
}>;

export function getTasks(params?: TaskListParams) {
  return http.get<Task[], TaskListParams>("/tasks/", { params });
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
  title: string;
  area_id: number;
  template_id?: number | null;
  assignee_id: number;
  due_date: string;
  is_emergency?: boolean;
  custom_check_items?: string[];
}) {
  return http.post<TaskDetail, any>("/tasks/create-adhoc/", { data: payload });
}
