/**
 * JWT 工具：仅用于读取 payload（不做验签）。
 * 说明：前端拿到 accessToken 后，解析出 user_id 方便请求参数拼装。
 */

type JwtPayload = Record<string, any>;

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLength);
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

/** 解析 JWT payload，解析失败返回 null */
export function parseJwtPayload<T extends JwtPayload = JwtPayload>(
  token?: string
): T | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as T;
  } catch {
    return null;
  }
}

/** 从 JWT 中提取用户 id（DRF simplejwt 默认字段为 user_id） */
export function getJwtUserId(token?: string): number | null {
  const payload = parseJwtPayload<{ user_id?: number | string }>(token);
  if (!payload) return null;
  const raw = payload.user_id;
  const value = typeof raw === "string" ? Number(raw) : raw;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

