/**
 * Deep Object.assign
 *
 * @param target
 * @param ...sources
 */

export default function deepAssign (target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isAssignableObject(target) && isAssignableObject(source)) {
    for (const key in source) {
      if (isAssignableObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepAssign(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepAssign(target, ...sources);
}

function isAssignableObject (item) {
  return item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Node);
}
