import type { Gender } from "../../schemas/index.js";
import type { UserProfile } from "../../schemas/profile.js";

const GENDER_LABEL: Record<Gender, string> = {
  male: "男",
  female: "女",
  unspecified: "（未指定）",
};

export function renderProfile(profile: UserProfile): string {
  const birth = profile.birth;
  const time = birth.time ?? (birth.timeUnknown ? "（未知）" : "");
  const leap = birth.lunarLeapMonth ? "（闰月）" : "";
  const lines = [
    "用户档案",
    "",
    `ID        : ${profile.userId}`,
    `出生      : ${birth.date} ${time}（${birth.calendar === "solar" ? "公历" : "农历"}${leap}）${GENDER_LABEL[birth.gender]}`,
  ];
  if (birth.place !== undefined && birth.place !== "") lines.push(`出生地    : ${birth.place}`);
  lines.push(
    `偏好模式  : ${profile.preferences.mode}`,
    `偏好模型  : ${profile.preferences.provider}`,
    `更新时间  : ${profile.updatedAt}`,
  );
  return lines.join("\n");
}
