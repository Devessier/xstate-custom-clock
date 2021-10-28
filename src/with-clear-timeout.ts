import { interpret } from 'xstate';
import { clockMachine } from './machine';

const service = interpret(clockMachine, {
    // Same as if we were not overriding `clock`.
    clock: {
        setTimeout: (fn, delay) => {
            return setTimeout(fn, delay);
        },

        clearTimeout: (id) => {
            return clearTimeout(id);
        },
    },
});

let currentState = clockMachine.initialState;
service.onTransition((state) => {
    currentState = state;
    console.log('state transition to:', state.value);
});

service.onDone(() => {
    console.log('service reached final state:', currentState.value);
});

service.start();
