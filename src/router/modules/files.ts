import { files } from "@/router/enums";

export default {
  path: "/files",
  alias: "/files/",
  redirect: "/files/index",
  meta: {
    icon: "ri-folder-3-line",
    title: "文件管理",
    auths: ["files"],
    rank: files
  },
  children: [
    {
      path: "/files/index",
      name: "FilesIndex",
      component: () => import("@/views/files/index.vue"),
      meta: {
        title: "文件管理",
        auths: ["files"],
        showParent: true
      }
    }
  ]
} satisfies RouteConfigsTable;
