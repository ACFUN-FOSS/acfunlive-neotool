// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageType = Record<string, Record<string, any>>;

export type Message<M extends MessageType> = {
  [Target in keyof M]: {
    [Type in keyof M[Target]]: {
      target: Target;
      type: Type;
      data: M[Target][Type];
    };
  }[keyof M[Target]];
}[keyof M];
