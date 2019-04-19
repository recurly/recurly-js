import Emitter from 'component-emitter';

export default class ReadinessEmitter extends Emitter {
  _ready = false;

  /**
   * Calls the callback when the instance is marked as ready
   *
   * @param  {Function} callback
   */
  whenReady (callback) {
    const { _ready } = this;
    if (_ready) callback();
    else this.once('ready', callback);
  }

  /**
   * Marks the instance as ready
   * @return {[type]} [description]
   */
  markReady () {
    this._ready = true;
    this.emit('ready');
  }
}
