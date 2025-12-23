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
      path: "/tasks/detail/:id",
      name: "TaskDetail",
      component: () => import("@/views/tasks/detail/index.vue"),
      meta: {
        title: "任务详情",
        showLink: false
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
    },
    {
      path: "/tasks/create-adhoc",
      name: "TaskCreateAdhoc",
      component: () => import("@/views/tasks/create-adhoc/index.vue"),
      meta: {
        title: "新建临时任务",
        showParent: true
      }
    },
    {
      path: "/tasks/edit/:id",
      name: "TaskEdit",
      component: () => import("@/views/tasks/edit/index.vue"),
      meta: {
        title: "编辑任务",
        showLink: false
      }
    }
  ]
} satisfies RouteConfigsTable;
