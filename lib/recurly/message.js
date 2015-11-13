export class Message {
  constructor (event, body = {}) {
    if (event instanceof Message) return event;
    if (event instanceof window.MessageEvent) {
      body = event.data.body;
      event = event.data.event;
    }
    this.event = event;
    this.body = body;
  }

  format () {
    return {
      event: this.event,
      body: this.body
    }
  }
}
