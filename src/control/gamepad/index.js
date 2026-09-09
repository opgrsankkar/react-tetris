import store from '../../store';
import todo from '../todo';
import gamepadLogic from './logic';

const listeners = [];
const getGamepads = navigator.getGamepads || navigator.webkitGetGamepads;
const requestFrame = (callback) => {
  if (window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
};
let started = false;
let frame = null;
let controlState = gamepadLogic.createControlState();
let status = {
  supported: !!getGamepads,
  connected: false,
  count: 0,
};

const notify = (nextStatus) => {
  if (nextStatus.supported === status.supported &&
      nextStatus.connected === status.connected &&
      nextStatus.count === status.count) {
    return;
  }
  status = nextStatus;
  listeners.forEach(listener => listener(status));
};

const connectedGamepads = () => {
  if (!getGamepads) {
    return [];
  }
  const gamepads = getGamepads.call(navigator) || [];
  return Array.prototype.filter.call(gamepads, gamepad => !!gamepad && gamepad.connected !== false);
};

const trigger = (action) => {
  const todoKey = {
    drop: 'space',
    pause: 'p',
  }[action] || action;
  todo[todoKey].down(store);
  todo[todoKey].up(store);
};

const poll = (time) => {
  const gamepads = connectedGamepads();
  notify({
    supported: !!getGamepads,
    connected: gamepads.length > 0,
    count: gamepads.length,
  });
  const step = gamepadLogic.advanceControl(
    controlState,
    gamepadLogic.readGamepads(gamepads),
    typeof time === 'number' ? time : Date.now()
  );
  controlState = step.state;
  step.actions.forEach(trigger);
  frame = requestFrame(poll);
};

const start = () => {
  if (started || !getGamepads) {
    return;
  }
  started = true;
  frame = requestFrame(poll);
};

const subscribe = (listener) => {
  listeners.push(listener);
  listener(status);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

window.addEventListener('gamepadconnected', start);
window.addEventListener('gamepaddisconnected', () => {
  controlState = gamepadLogic.createControlState();
});

export default {
  start,
  subscribe,
  getStatus: () => status,
  getFrame: () => frame,
};
