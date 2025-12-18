import { dashboard } from "@/router/enums";

export default {
  path: "/dashboard",
  redirect: "/dashboard/leader",
  meta: {
    icon: "ri/dashboard-line",
    title: "总看板",
    rank: dashboard
  },
  children: [
    {
      path: "/dashboard/leader",
      name: "LeaderDashboard",
      component: () => import("@/views/dashboard/leader/index.vue"),
      meta: {
        title: "总看板",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;

