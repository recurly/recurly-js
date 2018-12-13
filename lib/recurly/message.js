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
  static createFromMessageEvent (messageEvent, debug = debug) {
    let data = messageEvent.data;

    // Parse a MessageEvent which originates from a relay
    if (typeof data === 'string') {
      debug('attempting to parse a relay-like message', data);
      data = dataFromRelayMessageEvent(data, debug);
    }

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
function dataFromRelayMessageEvent (data, debug) {
  try {
    data = JSON.parse(data);
  } catch (e) {
    debug('failed to parse relay message', e, messageEvent);
  }

  if (!data) {
    debug('no data in relay message');
    return;
  }

  return {
    event: data.recurly_event,
    body: data.recurly_message
  };
}
