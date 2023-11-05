enum StateFlag {
  Disconnect = 0,
  Connect = 1 << 0,
  Login = 1 << 1,
  HasClientId = 1 << 2
}

export class SessionState {
  private state: StateFlag;

  static fromState(state: SessionState): SessionState {
    const newState = new SessionState();
    newState.state = state.state;

    return newState;
  }

  constructor() {
    this.state = StateFlag.Disconnect;
  }

  isConnecting(): boolean {
    return (this.state & StateFlag.Connect) === StateFlag.Connect;
  }

  isLogin(): boolean {
    return (this.state & StateFlag.Login) === StateFlag.Login;
  }

  hasClientId(): boolean {
    return (this.state & StateFlag.HasClientId) === StateFlag.HasClientId;
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
    if (!this.isConnecting()) {
      throw new Error('session is not connected');
    }
  }

  login(): this {
    this.checkConnect();
    this.state |= StateFlag.Login;

    return this;
  }

  checkLogin(): void {
    this.checkConnect();
    if (!this.isLogin()) {
      throw new Error('session is not login');
    }
  }

  hasSetClientId(): this {
    this.checkConnect();
    this.state |= StateFlag.HasClientId;

    return this;
  }
}
