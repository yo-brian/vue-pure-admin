import { config } from "@/router/enums";

export default {
  path: "/config",
  redirect: "/config/areas",
  meta: {
    icon: "ri/settings-3-line",
    title: "配置管理",
    auths: ["config"],
    rank: config
  },
  children: [
    {
      path: "/config/areas",
      name: "ConfigAreas",
      component: () => import("@/views/config/areas/index.vue"),
      meta: {
        title: "检查区域",
        auths: ["config:areas"],
        showParent: true
      }
    },
    {
      path: "/config/templates",
      name: "ConfigTemplates",
      component: () => import("@/views/config/templates/index.vue"),
      meta: {
        title: "检查模板",
        auths: ["config:templates"],
        showParent: true
      }
    },
    {
      path: "/config/hazard-templates",
      name: "ConfigHazardTemplates",
      component: () => import("@/views/hazards/templates/index.vue"),
      meta: {
        title: "隐患模板",
        auths: ["config:hazard-templates"],
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
