import type { Ref } from "@vue/reactivity";
import { computed } from "vue";
import type { ChartData, ChartDataSet } from "../chart";
import { ChartType } from "../chart";

export interface UseChartHelperReturn {
  max: Ref<number>;
  alternativeMax: Ref<number>;
  min: Ref<number>;
  alternativeMin: Ref<number>;
  difference: Ref<number>;
  alternativeDifference: Ref<number>;
  maxDataPoints: Ref<number>;
  firstLabel: Ref<string>;
  hasBarChart: Ref<boolean>;
  hasAlternativeDataSet: Ref<boolean>;
  labelYList: Ref<string[]>;
  alternativeLabelYList: Ref<string[]>;
  lastLabel: Ref<string>;
}

export const useChartHelper = ({
  data,
  labels,
}: {
  data: Ref<ChartData>;
  labels?: Ref<{ y?: boolean; x?: boolean }>;
}): UseChartHelperReturn => {
  const maxDataPoints = computed(() =>
    Math.max(...data.value.datasets.map((set: ChartDataSet) => set.data.length))
  );

  const multiplier = computed(() => {
    return labels?.value.y ? 1.4 : 1;
  });

  const difference = computed(() => max.value - min.value);
  const alternativeDifference = computed(
    () => alternativeMax.value - alternativeMin.value
  );

  const firstLabel = computed(() => {
    return data.value.labels[0];
  });

  const lastLabel = computed(() => {
    return data.value.labels[data.value.labels.length - 1];
  });

  const hasAlternativeDataSet = computed(() =>
    data.value.datasets.some(({ isAlternative }: ChartDataSet) => isAlternative)
  );
  const hasBarChart = computed(() =>
    data.value.datasets.some(({ type }: ChartDataSet) => type === ChartType.BAR)
  );
  const hasMultipleBarTypes = computed(() => {
    const map = data.value.datasets
      .map((set: ChartDataSet) => set.type)
      .reduce((types: Map<string, number>, type: ChartType) => {
        if (!types.has(type)) {
          types.set(type, 0);
        }

        types.set(type, types.get(type)! + 1);

        return types;
      }, new Map());

    return map.get(ChartType.BAR)! >= 2;
  });

  const getMax = (datasets: ChartDataSet[]): number => {
    if (hasMultipleBarTypes.value) {
      const accumulated = datasets.reduce(
        (map: Map<number, number>, set: ChartDataSet) => {
          set.data.forEach((value: number, key: number) => {
            if (!map.has(key)) {
              map.set(key, 0);
            }

            map.set(key, map.get(key)! + value);
          });
          return map;
        },
        new Map()
      );

      return Math.max(...accumulated.values()) * multiplier.value;
    }

    return (
      Math.max(...datasets.flatMap(({ data }: ChartDataSet) => data)) *
      multiplier.value
    );
  };

  const getMin = (datasets: ChartDataSet[]): number => {
    const min = Math.min(...datasets.flatMap(({ data }: ChartDataSet) => data));

    if (hasBarChart.value || min >= 0) return 0;

    return min - (max.value - max.value / multiplier.value);
  };

  const alternativeDatasets = computed(() =>
    data.value.datasets.filter((set: ChartDataSet) => set.isAlternative)
  );
  const datasets = computed(() =>
    data.value.datasets.filter((set: ChartDataSet) => !set.isAlternative)
  );

  const max = computed(() => {
    return getMax(datasets.value);
  });

  const alternativeMax = computed(() => {
    return getMax(alternativeDatasets.value);
  });

  const min = computed(() => {
    return getMin(datasets.value);
  });

  const alternativeMin = computed(() => {
    return getMin(alternativeDatasets.value);
  });

  const labelYList = computed(() => {
    return getLabelList(difference.value, min.value, max.value);
  });
  const alternativeLabelYList = computed(() => {
    return getLabelList(
      alternativeDifference.value,
      alternativeMin.value,
      max.value
    );
  });

  return {
    min,
    alternativeMin,
    max,
    alternativeMax,
    hasBarChart,
    hasAlternativeDataSet,
    alternativeDifference,
    difference,
    firstLabel,
    lastLabel,
    maxDataPoints,
    labelYList,
    alternativeLabelYList,
  };
};

const getLabelList = (
  difference: number,
  min: number,
  max: number
): string[] => {
  return Array.from({ length: 5 }, (x, i) => {
    const value = difference - (difference / 4) * i + min;

    if (value >= 1_000_000) {
      return `${Math.round(value / 1_000_000)}m`;
    }
    if (value >= 1_000) {
      return `${Math.round(value / 1_000)}k`;
    }

    if (max > 20) {
      return Math.round(value).toString();
    }

    return value.toFixed(1);
  });
};
export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number },
  fill: boolean,
  stroke: boolean
): void => {
  if (typeof stroke === "undefined") {
    stroke = true;
  }

  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = {
      tl: radius.tl || 0,
      tr: radius.tr || 0,
      br: radius.br || 0,
      bl: radius.bl || 0,
    };
  }

  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius.br,
    y + height
  );
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
};
