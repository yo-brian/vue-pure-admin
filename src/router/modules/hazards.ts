import { hazards } from "@/router/enums";

export default {
  path: "/hazards",
  redirect: "/hazards/list",
  meta: {
    icon: "ri/alarm-warning-line",
    title: "隐患管理",
    rank: hazards
  },
  children: [
    {
      path: "/hazards/list",
      name: "HazardsList",
      component: () => import("@/views/hazards/list/index.vue"),
      meta: {
        title: "隐患列表",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;

