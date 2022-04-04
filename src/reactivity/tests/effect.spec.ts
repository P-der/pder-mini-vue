import { effect, stop } from "../effect"
import { reactive } from "../reactive"

describe('effect', () => {
    test('init', () => {
        const user = reactive({
            age: 18
        })
        let ages = 0
        effect(() => {
            ages = user.age
        })
        expect(ages).toBe(18)
        user.age++
        expect(ages).toBe(19)
    })
    test('return runner', () => {
        let foo = 10
        const runner = effect(() => {
            foo++
            return 'foo'
        })
        expect(foo).toBe(11)
        const r = runner()
        expect(foo).toBe(12)
        expect(r).toBe('foo')
    })
    test("scheduler", () => {
        let dummy;
        let run: any;
        const scheduler = jest.fn(() => {
            run = runner;
        });
        const obj = reactive({ foo: 1 });
        const runner = effect(
            () => {
                dummy = obj.foo;
            },
            { scheduler }
        );
        expect(scheduler).not.toHaveBeenCalled();
        expect(dummy).toBe(1);
        // should be called on first trigger
        obj.foo++;
        expect(scheduler).toHaveBeenCalledTimes(1);
        // // should not run yet
        expect(dummy).toBe(1);
        // // manually run
        run();
        // // should have run
        expect(dummy).toBe(2);
    });
    test("stop", () => {
        let dummy;
        const obj = reactive({ prop: 1 });
        const runner = effect(() => {
            dummy = obj.prop;
        });
        obj.prop = 2;
        expect(dummy).toBe(2);
        stop(runner);
        obj.prop = 3
        obj.prop++;

        expect(dummy).toBe(2);

        // stopped effect should still be manually callable
        runner();
        expect(dummy).toBe(4);
    });

    test("events: onStop", () => {
        const onStop = jest.fn();
        const runner = effect(() => { }, {
            onStop,
        });

        stop(runner);
        expect(onStop).toHaveBeenCalled();
    });
})