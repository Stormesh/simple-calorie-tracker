// Reactivity that must survive individual components (cookie refs, timers,
// listeners) is created in a detached effect scope instead of whatever
// component setup happens to run first — otherwise it dies when that
// component unmounts, silently breaking cookie persistence.
export function inSessionScope<T>(factory: () => T): T {
  return effectScope(true).run(factory)!;
}
