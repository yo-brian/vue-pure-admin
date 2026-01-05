import { system } from "@/router/enums";

export default {
  path: "/system",
  redirect: "/system/user",
  meta: {
    icon: "ri/settings-3-line",
    title: "系统管理",
    auths: ["system"],
    rank: system
  },
  children: [
    {
      path: "/system/user",
      name: "SystemUser",
      component: () => import("@/views/system/user/index.vue"),
      meta: {
        title: "用户管理",
        auths: ["system:user"],
        showParent: true
      }
    },
    {
      path: "/system/role",
      name: "SystemRole",
      component: () => import("@/views/system/role/index.vue"),
      meta: {
        title: "角色管理",
        auths: ["system:role"],
        showParent: true
      }
    },
    {
      path: "/system/menu",
      name: "SystemMenu",
      component: () => import("@/views/system/menu/index.vue"),
      meta: {
        title: "权限管理",
        auths: ["system:menu"],
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
