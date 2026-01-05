import { http } from "@/utils/http";

export type DashboardSummary = {
  role: string;
  scope: "self" | "all";
  kpis: {
    today_task_total: number;
    today_task_completed: number;
    today_task_completion_rate: number;
    pending_emergency_tasks: number;
    open_hazard_total: number;
    major_hazard_total: number;
    overdue_task_total: number;
    overdue_hazard_total: number;
  };
  trends: {
    labels: string[];
    tasks_completed: number[];
    hazards_created: number[];
  };
  alerts: {
    overdue_tasks: Array<{
      id: number;
      title: string;
      due_date: string;
      assignee_name: string;
      area_name: string;
    }>;
    overdue_hazards: Array<{
      id: number;
      title: string;
      level: string;
      due_date: string;
      area_name: string;
    }>;
  };
  distribution: {
    hazards_by_area: Array<{ name: string; count: number }>;
    tasks_by_area: Array<{ name: string; count: number }>;
  };
};

export function getDashboardSummary() {
  return http.get<DashboardSummary, any>("/dashboard/summary/");
}
