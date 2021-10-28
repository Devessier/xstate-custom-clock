import { createModel } from 'xstate/lib/model.js';

const clockModel = createModel({}, { events: {} });

export const clockMachine = clockModel.createMachine({
    initial: 'ping',

    after: {
        15_000: {
            target: 'timerHasBeenCancelled',
        },
    },

    states: {
        ping: {
            after: {
                10_000: {
                    target: 'timerHasNotBeenCancelled',
                },

                7_000: {
                    target: 'pong',
                },
            },
        },

        pong: {
            after: {
                1_000: {
                    target: 'ping',
                },
            },
        },

        timerHasNotBeenCancelled: {
            type: 'final',
        },

        timerHasBeenCancelled: {
            type: 'final',
        },
    },
});
