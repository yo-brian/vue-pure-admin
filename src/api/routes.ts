import { http } from "@/utils/http";

type Result = {
  success: boolean;
  data: Array<any>;
};

export const getAsyncRoutes = () => {
  // 说明：当前阶段菜单由前端静态路由提供，后端暂不返回动态路由数据
  // 如需启用后端动态路由，再恢复为请求 `/get-async-routes` 即可
  return Promise.resolve({ success: true, data: [] } as Result);
};
