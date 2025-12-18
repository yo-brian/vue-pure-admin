import { http } from "@/utils/http";

export type DashboardSummary = {
  today_task_total: number;
  today_task_completed: number;
  today_task_completion_rate: number;
  open_hazard_total: number;
  major_hazard_total: number;
  pending_emergency_tasks: number;
};

export function getDashboardSummary() {
  return http.get<DashboardSummary, any>("/dashboard/summary/");
}

