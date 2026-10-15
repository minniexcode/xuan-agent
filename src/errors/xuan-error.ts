import type { XuanErrorCode, XuanErrorStage } from "./error-codes.js";

/** Structured error shape shared by the CLI, SDK and HTTP API. */
export interface XuanErrorShape {
  code: XuanErrorCode;
  message: string;
  stage: XuanErrorStage;
  /** Whether the caller should retry or change input (true) vs. treat it as fatal (false). */
  recoverable: boolean;
  details?: Record<string, unknown>;
}

/** Canonical error type carrying code, stage and recoverability. */
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

  /** Convert back to the plain, serializable shape (omits `details` when unset). */
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

  /** Normalize any thrown value into a XuanError, preserving the original message in details.cause. */
  static from(err: unknown, fallback: Omit<XuanErrorShape, "details">): XuanError {
    if (err instanceof XuanError) return err;
    const cause = err instanceof Error ? err.message : String(err);
    return new XuanError({ ...fallback, details: { cause } });
  }
}
