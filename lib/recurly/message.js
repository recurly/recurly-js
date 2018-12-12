/**
 * Message
 *
 * @param {String|Message|MessageEvent} event message event name or Message or MessageEvent
 * @param {Object} body message contents
 */

export class Message {
  constructor (event, body = {}, groupId) {
    if (event instanceof Message) return event;
    if (event instanceof window.MessageEvent) {
      event = event.data.event;
      body = event.data.body;
      groupId = event.data.groupId;
    }
    this.event = event;
    this.body = body;
    this.groupId = groupId;
  }
}
