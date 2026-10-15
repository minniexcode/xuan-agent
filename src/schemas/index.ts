import { z } from "zod";

// ---------------------------------------------------------------------------
// 通用枚举
// ---------------------------------------------------------------------------

export const OutputModeSchema = z.enum(["beginner", "advanced", "both"]);
export type OutputMode = z.infer<typeof OutputModeSchema>;

export const CalendarTypeSchema = z.enum(["solar", "lunar"]);
export type CalendarType = z.infer<typeof CalendarTypeSchema>;

export const GenderSchema = z.enum(["male", "female", "unspecified"]);
export type Gender = z.infer<typeof GenderSchema>;

/**
 * Provider 只标识服务方；具体模型由 `model` 表达
 * （DeepSeek 走 openai-compatible，model 为 deepseek-chat）。
 */
export const ProviderNameSchema = z.enum(["anthropic", "openai-compatible", "mock"]);
export type ProviderName = z.infer<typeof ProviderNameSchema>;

// ---------------------------------------------------------------------------
// FR-BAZI-01 出生信息采集
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 严格校验：含糊日期一律拒绝（由交互层追问澄清，绝不猜测）。
 * 详见 docs/requirements.md FR-BAZI-01。
 */
export const BirthInputSchema = z
  .object({
    date: z
      .string()
      .regex(DATE_PATTERN, "出生日期必须为 YYYY-MM-DD；含糊格式应交由 Agent 追问澄清，不得猜测"),
    time: z.string().regex(TIME_PATTERN, "出生时间必须为 HH:mm").optional(),
    timeUnknown: z.boolean().optional(),
    gender: GenderSchema,
    /** V1 仅作备注，不参与计算。 */
    place: z.string().optional(),
    calendar: CalendarTypeSchema,
    /** 农历闰月（仅 calendar === "lunar" 时生效，内部转为负月份）。 */
    lunarLeapMonth: z.boolean().default(false),
    /** V1 恒为 false（真太阳时留待 V2）。 */
    useTrueSolarTime: z.boolean().default(false),
    mode: OutputModeSchema.optional(),
  })
  .refine((v) => (v.time === undefined) !== (v.timeUnknown === undefined), {
    message: "time 与 timeUnknown 必须二选一",
  });

/** 排盘用的已归一化输入（默认值已填充）。 */
export type BirthInput = z.infer<typeof BirthInputSchema>;
/** 调用方传入的形式（useTrueSolarTime / lunarLeapMonth 等可省略）。 */
export type BirthInputRequest = z.input<typeof BirthInputSchema>;
