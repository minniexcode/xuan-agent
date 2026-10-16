import { z } from "zod";

// ---------------------------------------------------------------------------
// Common enums
// ---------------------------------------------------------------------------

/** Output mode (FR-BAZI-03 beginner / FR-BAZI-04 advanced). V1 emits one mode per request. */
export const OutputModeSchema = z.enum(["beginner", "advanced"]);
/** Output mode (FR-BAZI-03 beginner / FR-BAZI-04 advanced). */
export type OutputMode = z.infer<typeof OutputModeSchema>;

/** Which calendar the supplied date is expressed in. */
export const CalendarTypeSchema = z.enum(["solar", "lunar"]);
export type CalendarType = z.infer<typeof CalendarTypeSchema>;

/** "unspecified" is allowed; gender only tunes interpretation, never calculation. */
export const GenderSchema = z.enum(["male", "female", "unspecified"]);
export type Gender = z.infer<typeof GenderSchema>;

/**
 * Provider identifies the service only; the concrete model is expressed by `model`
 * (DeepSeek goes through openai-compatible with model = deepseek-chat).
 */
export const ProviderNameSchema = z.enum(["anthropic", "openai-compatible", "mock"]);
export type ProviderName = z.infer<typeof ProviderNameSchema>;

// ---------------------------------------------------------------------------
// FR-BAZI-01 birth info collection
// ---------------------------------------------------------------------------

/** Strict YYYY-MM-DD date; ambiguous formats are rejected, never guessed. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 24-hour HH:mm time. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True when `y-m-d` is a real Gregorian calendar date (leap-year aware). */
function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = monthLengths[month - 1];
  return day >= 1 && maxDay !== undefined && day <= maxDay;
}

/**
 * Strict validation: ambiguous dates are always rejected (the interaction layer
 * asks the user to clarify, never guesses). See docs/requirements.md FR-BAZI-01.
 */
export const BirthInputSchema = z
  .object({
    date: z
      .string()
      .regex(DATE_PATTERN, "出生日期必须为 YYYY-MM-DD；含糊格式应交由 Agent 追问澄清，不得猜测"),
    /** Birth time; omitted when the time is unknown. */
    time: z.string().regex(TIME_PATTERN, "出生时间必须为 HH:mm").optional(),
    /** Set true when the birth time is unknown; mutually exclusive with `time`. */
    timeUnknown: z.literal(true).optional(),
    gender: GenderSchema,
    /** V1: annotation only, not used in calculation. */
    place: z.string().optional(),
    calendar: CalendarTypeSchema,
    /** Lunar leap month (only effective when calendar === "lunar"; mapped to a negative month internally). */
    lunarLeapMonth: z.boolean().default(false),
    /** Always false in V1 (true solar time is deferred to V2). */
    useTrueSolarTime: z.boolean().default(false),
    mode: OutputModeSchema.optional(),
  })
  // Enforce exactly one of `time` / `timeUnknown` (XOR): supply the time, or
  // explicitly mark it unknown — never both, never neither.
  .refine((v) => (v.time === undefined) !== (v.timeUnknown === undefined), {
    message: "time 与 timeUnknown 必须二选一",
  })
  // Reject impossible solar dates (e.g. 1995-02-30) before they reach the calculator;
  // lunar validity is judged by the library (FR-BAZI-01).
  .refine(
    (v) => {
      if (v.calendar !== "solar") return true;
      const [year, month, day] = v.date.split("-").map(Number) as [number, number, number];
      return isValidSolarDate(year, month, day);
    },
    { message: "出生日期不是有效的公历日期" },
  );

/** Normalized input used for chart calculation (defaults already filled). */
export type BirthInput = z.infer<typeof BirthInputSchema>;
/** Caller-facing shape: optional fields such as useTrueSolarTime / lunarLeapMonth may be omitted. */
export type BirthInputRequest = z.input<typeof BirthInputSchema>;
