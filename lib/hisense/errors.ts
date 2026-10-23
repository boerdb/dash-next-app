export class ConnectLifeError extends Error {
  constructor(
    message: string,
    readonly auth = false,
  ) {
    super(message);
    this.name = "ConnectLifeError";
  }
}
