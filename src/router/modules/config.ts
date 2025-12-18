import { config } from "@/router/enums";

export default {
  path: "/config",
  redirect: "/config/areas",
  meta: {
    icon: "ri/settings-3-line",
    title: "配置管理",
    rank: config
  },
  children: [
    {
      path: "/config/areas",
      name: "ConfigAreas",
      component: () => import("@/views/config/areas/index.vue"),
      meta: {
        title: "检查区域",
        showParent: true
      }
    },
    {
      path: "/config/templates",
      name: "ConfigTemplates",
      component: () => import("@/views/config/templates/index.vue"),
      meta: {
        title: "检查模板",
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;

