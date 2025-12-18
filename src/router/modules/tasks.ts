import { tasks } from "@/router/enums";

export default {
  path: "/tasks",
  redirect: "/tasks/my",
  meta: {
    icon: "ri/task-line",
    title: "巡检任务",
    rank: tasks
  },
  children: [
    {
      path: "/tasks/my",
      name: "TasksMy",
      component: () => import("@/views/tasks/my/index.vue"),
      meta: {
        title: "我的任务",
        showParent: true
      }
    },
    {
      path: "/tasks/all",
      name: "TasksAll",
      component: () => import("@/views/tasks/all/index.vue"),
      meta: {
        title: "全部任务",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;

