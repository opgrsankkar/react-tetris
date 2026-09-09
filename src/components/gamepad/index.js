import React from 'react';
import classnames from 'classnames';
import gamepad from '../../control/gamepad';
import style from './index.less';

export default class GamepadStatus extends React.Component {
  constructor() {
    super();
    this.state = gamepad.getStatus();
  }
  componentDidMount() {
    this.unsubscribe = gamepad.subscribe(status => this.setState(status));
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  render() {
    const connected = this.state.connected;
    let text = 'CONTROLLER: PRESS A BUTTON TO CONNECT';
    if (!this.state.supported) {
      text = 'CONTROLLER: NOT AVAILABLE';
    } else if (connected) {
      text = 'CONTROLLER READY · D-PAD/STICK MOVE · A/B ROTATE · X/Y/L/R DROP · START PAUSE';
    }
    return (
      <p
        className={classnames({ [style.status]: true, [style.connected]: connected })}
        aria-live="polite"
      >
        {text}
      </p>
    );
  }
}
