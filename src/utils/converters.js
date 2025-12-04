export function getSvgPathFromStroke(stroke) {
    if (!stroke.length) return ""
  
    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length]
        acc.push(
          Math.round(x0 * 10) / 10,
          Math.round(y0 * 10) / 10,
          Math.round(((x0 + x1) / 2) * 10) / 10,
          Math.round(((y0 + y1) / 2) * 10) / 10
        )
        return acc
      },
      ["M", ...stroke[0].map(x => Math.round(x * 10) / 10), "Q"]
    )
    d.push("Z")
    return d.join(" ")
  }

export function rgbObjectToString(rgbObject) {
    return `rgb(${rgbObject.r}, ${rgbObject.g}, ${rgbObject.b}, ${rgbObject.a})`;
}

export function getPlacement(e, scaleRef) {
    const pageGrid = document.getElementById('pageGrid');
    if (!pageGrid) {
        console.error('pageGrid element not found');
        return;
    }

    const gridRect = pageGrid.getBoundingClientRect();
    const relativeX = e.clientX - gridRect.left;
    const relativeY = e.clientY - gridRect.top;

    // Account for scaling factor
    const scaledX = relativeX / scaleRef.current;
    const scaledY = relativeY / scaleRef.current;

    return {
        x: scaledX,
        y: scaledY
    };
}