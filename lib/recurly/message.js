const debug = require('debug')('recurly:message');

/**
 * Message
 *
 * @param {String|Message|MessageEvent} event message event name or Message or MessageEvent
 * @param {Object} body message contents
 */
export class Message {
  constructor (event, body = {}, groupId) {
    if (event instanceof Message) return event;
    this.event = event;
    this.body = body;
    this.groupId = groupId;
  }

  /**
   * Creates a message from a window.MessageEvent
   *
   * @param  {MessageEvent} messageEvent
   * @return {Message}
   */
  static createFromMessageEvent (messageEvent) {
    let data = messageEvent.data;

    // Parse a MessageEvent which originates from a relay
    if (typeof data === 'string') data = dataFromRelayMessageEvent(data);

    if (!data) return;

    return new Message(data.event, data.body, data.groupId);
  }
}

/**
 * Parses a messageEvent coming from a Frame relay
 *
 * NOTE: groupId is not handled because Frames subscribe to unique topics
 *
 * @param  {String} data message data as a JSON string
 * @return {Object} parsed message data: { event, body }
 */
function dataFromRelayMessageEvent (data) {
  try {
    data = JSON.parse(data);
    debug('message received via relay', data);
    if (!data) return;
    return {
      event: data.recurly_event,
      body: data.recurly_message
    };
  } catch (e) {
    debug('failed to parse a string message', e, data);
    return;
  }
}
