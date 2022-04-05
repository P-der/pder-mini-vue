import { isProxy, isReactive, isReadonly,  readonly } from "../index";

describe("readonly", () => {
  test("should make nested values readonly", () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(wrapped.foo).toBe(1);
  });
  test("set readonly console err", () => {
    console.warn = jest.fn()
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    wrapped.foo++
    expect(console.warn).toBeCalled()
  })
  test("判断类型", () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(isProxy(wrapped)).toBe(true);
    expect(isReactive(wrapped)).toBe(false);
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(isReadonly(original)).toBe(false);
    expect(isReactive(wrapped.bar)).toBe(false);
    expect(isReadonly(wrapped.bar)).toBe(true);
    expect(isReactive(original.bar)).toBe(false);
    expect(isReadonly(original.bar)).toBe(false);
  })
});
