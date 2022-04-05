import { isReactive, isReadonly, reactive, readonly, shallowReadonly } from "../index";

describe('reactive', ()=> {
    test('init', ()=> {
        const origin = {
            foo: 1
        }
        const observe = reactive(origin)

        expect(observe).not.toBe(origin)
        expect(observe.foo).toBe(1)
        expect(origin.foo).toBe(1)
    })
    test("nested reactives", () => {
        const original = {
          nested: {
            foo: 1,
          },
          array: [{ bar: 2 }],
        };
        const observed = reactive(original);
        expect(isReactive(observed.nested)).toBe(true);
        expect(isReactive(observed.array)).toBe(true);
        expect(isReactive(observed.array[0])).toBe(true);
      }); 
})

describe("shallowReadonly", () => {
    test("should not make non-reactive properties reactive", () => {
      const props = shallowReadonly({ n: { foo: 1 } });
      expect(isReactive(props.n)).toBe(false);
    });
    test("should differentiate from normal readonly calls", async () => {
      const original = { foo: {} };
      const shallowProxy = shallowReadonly(original);
      const reactiveProxy = readonly(original);
      expect(shallowProxy).not.toBe(reactiveProxy);
      expect(isReadonly(shallowProxy.foo)).toBe(false);
      expect(isReadonly(reactiveProxy.foo)).toBe(true);
    });
  });