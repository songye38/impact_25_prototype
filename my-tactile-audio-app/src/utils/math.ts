// ---------- Utility helpers ----------






export const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export const minMax = (arr: number[]) => {
    if (!arr.length) return { min: 0, max: 0 };
    let mn = arr[0];
    let mx = arr[0];
    for (let v of arr) {
        if (v < mn) mn = v;
        if (v > mx) mx = v;
    }
    return { min: mn, max: mx };
};

// simple linear regression y = a + b x, returns slope b
export const slope = (xs: number[], ys: number[]) => {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0;
    const meanX = mean(xs.slice(0, n));
    const meanY = mean(ys.slice(0, n));
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        num += dx * dy;
        den += dx * dx;
    }
    return den === 0 ? 0 : num / den;
};

// equal-width binning into k bins
export const binning = (values: number[], k = 3) => {
    if (!values.length) return { edges: [], bins: [] as number[] };
    const { min, max } = minMax(values);
    const width = (max - min) / k || 1;
    const edges = Array.from({ length: k + 1 }, (_, i) => min + i * width);
    const bins = values.map((v) => {
        const idx = Math.min(k - 1, Math.max(0, Math.floor((v - min) / width)));
        return idx;
    });
    return { edges, bins };
};

// frequency count by label
export const countBy = <T extends string | number>(arr: T[]) =>
    arr.reduce<Record<string, number>>((acc, v) => {
        acc[String(v)] = (acc[String(v)] || 0) + 1;
        return acc;
    }, {});