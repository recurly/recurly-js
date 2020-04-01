interface Emitter<Event = string> {
  on(event: Event, listener: Function): Emitter<Event>;
  once(event: Event, listener: Function): Emitter<Event>;
  off(event?: Event, listener?: Function): Emitter<Event>;
  emit(event: Event, ...args: any[]): Emitter<Event>;
  listeners(event: Event): Function[];
  hasListeners(event: Event): boolean;
}

declare const Emitter: {
  (obj?: object): Emitter;
  new (obj?: object): Emitter;
};

export = Emitter;
