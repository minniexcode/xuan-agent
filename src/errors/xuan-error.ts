import type { XuanErrorCode, XuanErrorStage } from "./error-codes.js";

/** 结构化错误形状，供 CLI、SDK 与 HTTP API 复用。 */
export interface XuanErrorShape {
  code: XuanErrorCode;
  message: string;
  stage: XuanErrorStage;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export class XuanError extends Error {
  readonly code: XuanErrorCode;
  readonly stage: XuanErrorStage;
  readonly recoverable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(shape: XuanErrorShape) {
    super(shape.message);
    this.name = "XuanError";
    this.code = shape.code;
    this.stage = shape.stage;
    this.recoverable = shape.recoverable;
    this.details = shape.details;
  }

  toShape(): XuanErrorShape {
    const shape: XuanErrorShape = {
      code: this.code,
      message: this.message,
      stage: this.stage,
      recoverable: this.recoverable,
    };
    if (this.details !== undefined) shape.details = this.details;
    return shape;
  }

  /** 把任意异常收敛为 XuanError，保留原始信息在 details.cause。 */
  static from(err: unknown, fallback: Omit<XuanErrorShape, "details">): XuanError {
    if (err instanceof XuanError) return err;
    const cause = err instanceof Error ? err.message : String(err);
    return new XuanError({ ...fallback, details: { cause } });
  }
}
