export class EmailServiceError extends Error {
  readonly code: "MISSING_CONFIG" | "SEND_FAILED" | "DEV_FALLBACK";

  constructor(code: EmailServiceError["code"], message: string) {
    super(message);
    this.name = "EmailServiceError";
    this.code = code;
  }
}
