# xstate-custom-clock

It's an experimentation to show that implementing `clearTimeout` is necessary for XState to work properly with a custom clock.

We created two scripts: [`src/with-clear-timeout.ts`](https://github.com/Devessier/xstate-custom-clock/blob/main/src/with-clear-timeout.ts) and [`src/without-clear-timeout.ts`](https://github.com/Devessier/xstate-custom-clock/blob/main/src/without-clear-timeout.ts), that use the same [machine](https://github.com/Devessier/xstate-custom-clock/blob/main/src/machine.ts).

For `src/with-clear-timeout.ts`, we implement `clearTimeout` method of the custom clock and we get the following expected logs:

```txt
state transition to: ping
state transition to: pong
state transition to: ping
state transition to: timerHasBeenCancelled
service reached final state: timerHasBeenCancelled
```

For `src/without-clear-timeout.ts`, we don't implement `clearTimeout` and timeouts are not cleared. We get the following logs:

```txt
state transition to: ping
state transition to: pong
state transition to: ping
state transition to: timerHasNotBeenCancelled
service reached final state: timerHasNotBeenCancelled
Warning: Event "xstate.after(15000)#(machine)" was sent to stopped service "(machine)". This service has already reached its final state, and will not transition.
Event: {"type":"xstate.after(15000)#(machine)"}
Warning: Event "xstate.after(7000)#(machine).ping" was sent to stopped service "(machine)". This service has already reached its final state, and will not transition.
Event: {"type":"xstate.after(7000)#(machine).ping"}
Warning: Event "xstate.after(10000)#(machine).ping" was sent to stopped service "(machine)". This service has already reached its final state, and will not transition.
Event: {"type":"xstate.after(10000)#(machine).ping"}
```

As we can see, we reach the final state `timerHasNotBeenCancelled`. This state should never be reached, unless timers are not cleared when they should be. Furthermore we can see that the machine, although it has been stopped because it has reached a final state, receives some timer events.

## Explanation

We need to take a look at [the implementation of delayed transitions in XState](https://xstate.js.org/docs/guides/delays.html#behind-the-scenes).

If we take `ping` state from our [state machine](https://github.com/Devessier/xstate-custom-clock/blob/main/src/machine.ts#L15) as an example, we get the following explicit code, without the syntactic sugar that `after` keyword is:

```ts
const clockMachine = createMachine({
    // ...
    states: {
        ping: {
            onEntry: [
                send(after(10_000, 'ping'), { delay: 10_000 }),
                send(after(7_000, 'ping'), { delay: 7_000 }),
            ],

            onExit: [
                cancel(after(10_000, 'ping')),
                cancel(after(7_000, 'ping')),
            ],

            on: {
                [after(10_000, 'ping')]: {
                    target: 'timerHasNotBeenCancelled'
                },

                [after(7_000, 'ping')]: {
                    target: 'pong'
                },
            },
        },
    },
    // ...
});
```

The key to understand how this works is the `after` action that can be imported from `xstate/lib/actions`. It behaves as follows:

```ts
import { after } from 'xstate/lib/actions';

after(10_000, 'ping')
// xstate.after(10000)#ping
```

It computes the name of an event from a delay and a source state id. There is *no* random unique identifier, it is a computation between a delay and a state id. This function is idempotent, if we provide the same parameters, it will always return the same result.

It means that if a timer is not cancelled when exiting the state where it has been created, and if we go back to this state, it will actually trigger an event once it resolves, and this event will be catched by handlers of the state. In our case, a transition to `timerHasNotBeenCancelled` state will be taken.

## Conclusion

To have a fully working custom clock we need to always provide both a `setTimeout` function and a `clearTimeout` function. If `clearTimeout` does not effectively clear the timer created by `setTimeout`, race conditions *will* occur.

## Setup

Be sure to run scripts with a version of Node.js that supports ESM, at least Node.js 14.x.

If you want to test the scripts locally, follow those steps:

1. Install dependencies: `yarn instal`
2. Launch working script: `yarn start:with-timeout`
3. Launch broken script: `yarn start:without-timeout`
