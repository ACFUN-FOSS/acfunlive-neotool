export enum StateFlag {
  Disconnect = 0,
  Connect = 1 << 0,
  Login = 1 << 1
}

export class SessionState {
  state: StateFlag;

  constructor() {
    this.state = StateFlag.Disconnect;
  }

  isConnect(): boolean {
    return (this.state & StateFlag.Connect) === StateFlag.Connect;
  }

  isLogin(): boolean {
    return (this.state & StateFlag.Login) === StateFlag.Login;
  }

  disconnect(): this {
    this.state = StateFlag.Disconnect;

    return this;
  }

  connect(): this {
    this.state = StateFlag.Connect;

    return this;
  }

  checkConnect(): void {
    if (!this.isConnect()) {
      throw new Error('session is not connected');
    }
  }

  login(): this {
    this.checkConnect();
    this.state |= StateFlag.Login;

    return this;
  }

  cancelLogin(): this {
    if (this.isConnect()) {
      this.connect();
    } else {
      this.disconnect();
    }

    return this;
  }

  checkLogin(): void {
    this.checkConnect();
    if (!this.isLogin()) {
      throw new Error('session is not login');
    }
  }
}
