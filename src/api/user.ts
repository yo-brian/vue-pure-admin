import { http } from "@/utils/http";
import type { DataInfo } from "@/utils/auth";

export type UserResult = {
  success: boolean;
  data: DataInfo<Date>;
};

export type RefreshTokenResult = {
  success: boolean;
  data: Pick<DataInfo<Date>, "accessToken" | "refreshToken" | "expires">;
};

export type UserInfo = {
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 邮箱 */
  email: string;
  /** 联系电话 */
  phone: string;
  /** 简介 */
  description: string;
};

export type UserInfoResult = {
  success: boolean;
  data: UserInfo;
};

export type AppUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string | null;
  role: "admin" | "inspector" | "manager";
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function unwrapPaginated<T>(data: T[] | PaginatedResponse<T>) {
  return Array.isArray(data) ? data : data.results;
}

type ResultTable = {
  success: boolean;
  data?: {
    /** 列表数据 */
    list: Array<any>;
    /** 总条目数 */
    total?: number;
    /** 每页显示条目个数 */
    pageSize?: number;
    /** 当前页数 */
    currentPage?: number;
  };
};

type JwtLoginResponse = {
  access?: string;
  refresh?: string;
  accessToken?: string;
  refreshToken?: string;
};

function parseJwtExpToDate(token: string): Date {
  // 仅用于读取 exp（无需验签），用于前端计算 accessToken 过期时间
  const payload = token.split(".")[1];
  if (!payload) return new Date(Date.now() + 60 * 60 * 1000);
  try {
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    const exp = typeof json?.exp === "number" ? json.exp : undefined;
    return exp ? new Date(exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);
  } catch {
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}

/** 登录 */
export const getLogin = (data?: object) => {
  return http
    .request<JwtLoginResponse>("post", "/auth/login/", { data })
    .then(res => {
      const access =
        res?.access || (res as any)?.accessToken || (res as any)?.data?.access;
      const refresh =
        res?.refresh ||
        (res as any)?.refreshToken ||
        (res as any)?.data?.refresh;

      if (!access || !refresh) {
        return Promise.resolve({
          success: false,
          data: null
        } as unknown as UserResult);
      }

      const expires = parseJwtExpToDate(access);
      const username = (data as any)?.username ?? "";

      return {
        success: true,
        data: {
          accessToken: access,
          refreshToken: refresh,
          expires,
          username,
          nickname: username,
          avatar: "",
          roles: [],
          permissions: []
        }
      } satisfies UserResult;
    });
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  const refreshToken = (data as any)?.refreshToken ?? (data as any)?.refresh;
  return http
    .request<{ access?: string; accessToken?: string }>(
      "post",
      "/auth/refresh/",
      {
        data: { refresh: refreshToken }
      }
    )
    .then(res => {
      const access = res?.access || (res as any)?.accessToken;
      if (!access || !refreshToken) {
        return Promise.resolve({
          success: false,
          data: null
        } as unknown as RefreshTokenResult);
      }
      return {
        success: true,
        data: {
          accessToken: access,
          refreshToken,
          expires: parseJwtExpToDate(access)
        }
      } satisfies RefreshTokenResult;
    });
};

/** 账户设置-个人信息 */
export const getMine = (data?: object) => {
  return http.request<UserInfoResult>("get", "/mine", { data });
};

/** 账户设置-个人安全日志 */
export const getMineLogs = (data?: object) => {
  return http.request<ResultTable>("get", "/mine-logs", { data });
};

export function getCurrentUser() {
  return http.get<AppUser, any>("/users/me/");
}

export function getUsers() {
  return http
    .get<AppUser[] | PaginatedResponse<AppUser>, any>("/users/", {
      params: { page_size: 100 }
    })
    .then(unwrapPaginated);
}
