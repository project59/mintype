export function rgbObjectToString(rgbObject) {
    return `rgba(${rgbObject.r}, ${rgbObject.g}, ${rgbObject.b}, ${rgbObject.a ?? 1})`;
}
