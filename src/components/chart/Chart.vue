<template>
  <div
    class="ct-chart relative flex gap-x-3 text-xs"
    @mouseenter="showTooltip = true"
    @mouseleave="onMouseLeave"
  >
    <ul v-if="labels?.y" class="label-list" :class="{ invisible: max === 0 }">
      <li
        v-for="(label, key) in labelYList"
        :key="key"
        class="-translate-y-1/2"
        :style="{ color: textColor }"
        :class="{ invisible: !showFirstLabel && key === 4 }"
      >
        {{ labelPrefix }} {{ label }}
      </li>
    </ul>
    <div class="flex flex-1 flex-col">
      <div
        ref="wrapperRef"
        class="wrapper relative w-full flex-1"
        @mousemove="onMouseMove"
      >
        <div
          ref="tooltipRef"
          class="tooltip absolute top-0 z-10 overflow-hidden rounded-md bg-gray-50 leading-normal shadow-md transition"
          :style="{
            transform: `translate(${tooltipX}px, ${tooltipY}px)`,
            backgroundColor: toolTipBackgroundColor,
          }"
          :class="{ 'opacity-0': !showTooltip }"
        >
          <header
            class="bg-gray-50 py-1 px-2"
            :style="{
              backgroundColor: toolTipBackgroundColor,
            }"
          >
            <p>
              <strong>
                {{ data.labels[index] }}
              </strong>
            </p>
          </header>
          <ul class="px-2">
            <li
              v-for="(
                { name, color, isAlternative, ...rest }, key
              ) in data.datasets"
              :key="key"
              class="flex items-center gap-x-1 border-b border-base py-1.5 last:border-0"
            >
              <span
                class="block h-2 w-2 rounded-full border-[1.5px]"
                :style="{
                  borderColor: rest.data[index] || !hasBarChart ? color : alt4,
                }"
              />
              <p>
                <strong class="font-mono text-md">
                  {{ isAlternative ? alternativeLabelPrefix : labelPrefix }}
                  {{ formatNumber(rest.data[index]) }}
                </strong>
                {{ name }}
              </p>
            </li>
          </ul>
        </div>
        <canvas ref="canvasRef" class="absolute !h-full !w-full" />
      </div>
      <div
        class="flex justify-between pt-2 text-xs font-semibold leading-none"
        :style="{ color: textColor }"
        v-if="labels.x"
      >
        <p ref="firstLabelRef">
          {{ firstLabel }}
        </p>
        <p ref="lastLabelRef">
          {{ lastLabel }}
        </p>
      </div>
    </div>
    <ul v-if="labels?.y && hasAlternativeDataSet" class="label-list">
      <li
        v-for="(label, key) in alternativeLabelYList"
        :key="key"
        class="-translate-y-1/2"
        :class="{ invisible: !showFirstLabel && key === 4 }"
      >
        {{ alternativeLabelPrefix }} {{ label }}
      </li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import {
  computed,
  defineEmits,
  reactive,
  ref,
  toRefs,
  watch,
  onMounted,
} from "vue";
import { ChartType } from "./constants";
import { useResizeObserver } from "@vueuse/core";
import { useClamp } from "@vueuse/math";
// import { storeToRefs } from "pinia";
import { roundRect, useChartHelper } from "./helpers";
import { formatNumber, useCssRgbVar } from "../../utilities";

export interface ChartEmits {
  (name: "update:index", value: number): void;
}
export interface ChartDataSet {
  name: string;
  type: ChartType;
  color: string;
  isAlternative?: boolean;
  previous?: number;
  next?: number;
  data: number[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataSet[];
}

export interface ChartProps {
  data: ChartData;
  gridLines?: {
    x?: boolean;
    y?: number;
  };
  labels?: {
    x?: boolean;
    y?: boolean;
  };
  labelPrefix?: string;
  alternativeLabelPrefix?: string;
  showFirstLabel?: boolean;
  toolTipBackgroundColor?: string;
  textColor?: string;
}

const props = withDefaults(defineProps<ChartProps>(), {
  gridLines: () => ({ x: true }),
  labels: () => ({ x: true, y: true }),
});

const emit = defineEmits<ChartEmits>();

const { data, gridLines, labels } = toRefs(props);
let alt4 = useCssRgbVar("--alt4");
const barMap = new Map();
// const store = useRootStore();
// const { themeColor } = storeToRefs(store);
const wrapperRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const size = reactive({ w: 0, h: 0 });

const padding = reactive({ t: 0, l: 5, r: 5, b: 5 });
const viewport = computed(() => {
  return {
    w: size.w - (padding.l + padding.r),
    h: size.h - (padding.t + padding.b),
  };
});
const barWidth = 4;
const showTooltip = ref(false);
const isTooltipOverflowing = ref(false);
const tooltipWidth = ref(0);
const tooltipHeight = ref(0);
const setIndex = ref(0);
const {
  max,
  difference,
  firstLabel,
  lastLabel,
  maxDataPoints,
  labelYList,
  alternativeMax,
  hasAlternativeDataSet,
  alternativeDifference,
  hasBarChart,
  alternativeLabelYList,
} = useChartHelper({
  data,
  labels,
});

const maxIndex = computed(() => maxDataPoints.value - 1);
const index = useClamp(0, 0, maxIndex);

useResizeObserver(wrapperRef, ([entry]) => {
  const { width: w, height: h } = entry.contentRect;
  const { devicePixelRatio = 1 } = window;

  ctx.value = canvasRef.value!.getContext("2d");
  canvasRef.value!.width = w * devicePixelRatio;
  canvasRef.value!.height = h * devicePixelRatio;
  ctx.value!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  size.w = w;
  size.h = h;
  init();
});

const offsetTick = computed(() => {
  return gridLines.value.x || hasBarChart.value ? tick.value / 2 : 0;
});
const tick = computed(() => {
  const offset = gridLines.value.x || hasBarChart.value ? 0 : 1;
  return viewport.value.w / (maxDataPoints.value - offset);
});

const tooltipX = computed(() => {
  const x = tick.value * index.value + padding.l + offsetTick.value;

  if (isTooltipOverflowing.value) {
    return x - tooltipWidth.value - 8;
  }

  return x + 8;
});

const tooltipY = computed(() => {
  const y =
    viewport.value.h -
    getDecimal(data.value.datasets[setIndex.value].data[index.value]) *
      viewport.value.h -
    tooltipHeight.value / 2;

  return Math.min(viewport.value.h - tooltipHeight.value, y);
});

const onMouseMove = ({ clientX }: MouseEvent): void => {
  const { left: wrapperLeft = 0 } =
    wrapperRef.value?.getBoundingClientRect() || {};

  const x = clientX - wrapperLeft - padding.l;

  const { width: tooltipW, height: tooltipH } =
    tooltipRef.value!.getBoundingClientRect();
  const { w } = viewport.value;

  const normalizedW = w + padding.l;
  tooltipWidth.value = tooltipW;
  tooltipHeight.value = tooltipH;
  isTooltipOverflowing.value = x + tooltipW + tick.value >= w;

  index.value = Math.floor((x / normalizedW) * maxDataPoints.value);

  emit("update:index", index.value);
};

const onMouseLeave = (): void => {
  showTooltip.value = false;
  draw();
};

const drawGridLinesX = (): void => {
  ctx.value!.save();

  ctx.value!.setLineDash([5, 11]);
  const zoneX = [];
  const { w, h } = viewport.value;

  for (let i = 0; i < maxDataPoints.value + 1; i++) {
    const x = i / maxDataPoints.value;
    const extra = !i ? 1 : -1;
    const normalizedX = x * w + extra + padding.l;

    if (showTooltip.value && (index.value === i || index.value + 1 === i)) {
      ctx.value!.strokeStyle = useCssRgbVar("--font-primary");
      zoneX.push(normalizedX);
    } else {
      ctx.value!.strokeStyle = useCssRgbVar("--alt2");
    }

    ctx.value!.beginPath();
    ctx.value!.moveTo(normalizedX, 0);
    ctx.value!.lineTo(normalizedX, h);
    ctx.value!.stroke();
  }

  ctx.value!.fillStyle = useCssRgbVar("--body");

  if (zoneX.length) {
    ctx.value!.fillRect(zoneX[0] + 1.5, 0, zoneX[1] - zoneX[0] - 3, h);
  }

  ctx.value!.restore();
};

const drawGridLinesY = (): void => {
  ctx.value!.save();

  const { y: gridLinesY = 2 } = gridLines.value;
  const offset = viewport.value.h / (gridLinesY - 1);

  for (let i = 0; i < gridLinesY; i++) {
    const y = offset * i;
    ctx.value!.beginPath();
    ctx.value!.strokeStyle = useCssRgbVar("--alt");
    ctx.value!.setLineDash([5, 3]);
    ctx.value!.moveTo(0, y);
    ctx.value!.lineTo(viewport.value.w, y);
    ctx.value!.stroke();
  }
  ctx.value!.restore();
};

const draw = (): void => {
  if (!ctx.value) return;
  const { w, h } = size;

  barMap.clear();
  ctx.value!.clearRect(0, 0, w, h);

  const { y: gridLinesY, x: gridLinesX } = gridLines.value || {};

  if (gridLinesY) {
    drawGridLinesY();
  }

  if (gridLinesX) {
    drawGridLinesX();
  }

  data.value.datasets.forEach((set, i) => {
    const { type } = set;

    switch (type) {
      case ChartType.LINE:
      case ChartType.DASHED_LINE:
        drawLines(set);
        break;
      case ChartType.BAR:
        drawBars(
          set,
          !data.value.datasets
            .slice(i + 1)
            .some((set) => set.type === ChartType.BAR)
        );
        break;
    }
  });
};

const drawBars = (
  { data, color, isAlternative }: ChartDataSet,
  isLast: boolean
): void => {
  const { w, h } = viewport.value;
  const halfBarWidth = barWidth / 2;
  const halfTick = tick.value / 2;
  data.forEach((value, i) => {
    const startYList = barMap.get(i) || [0];
    const startY = startYList[startYList.length - 1];
    const x = (w * i) / data.length + halfTick - halfBarWidth + padding.l;
    const y = Math.min(
      gridLines.value.x ? h : h - 6,
      h * (1 - getDecimal(value, isAlternative)) - startY
    );

    const height = h - y - startY;

    barMap.set(i, [...startYList, height]);
    ctx.value!.beginPath();
    ctx.value!.fillStyle = value ? color : useCssRgbVar("--alt");

    const topRadius = isLast ? 2 : 0;

    roundRect(
      ctx.value!,
      x,
      y,
      barWidth,
      height,
      {
        tl: topRadius,
        tr: topRadius,
        br: 0,
        bl: 0,
      },
      true,
      false
    );
  });
};

const getDecimal = (value: number, isAlternative?: boolean): number => {
  const { value: normalizedMax } = isAlternative ? alternativeMax : max;
  const { value: normalizedDifference } = isAlternative
    ? alternativeDifference
    : difference;

  if (!normalizedMax) return 0;

  if (value >= normalizedMax) return 1;

  return 1 - Math.abs(value - normalizedMax) / normalizedDifference;
};

const getLinePoint = ({
  value,
  index,
  isAlternative,
  data,
  h,
  normalizedW,
}: {
  isAlternative?: boolean;
  value: number;
  index: number;
  h: number;
  data: number[];
  normalizedW: number;
}): { x: number; y: number } => {
  const x = index / (data.length - 1);
  const y = getDecimal(value, isAlternative);
  const normalizedX = x * normalizedW + offsetTick.value + padding.l;
  const normalizedY = h - y * h;

  return { x: normalizedX, y: normalizedY };
};

const drawLines = ({
  data: list,
  color,
  type,
  previous,
  isAlternative,
  next,
}: ChartDataSet): void => {
  const { w, h } = viewport.value;

  const normalizedW = w - offsetTick.value * 2;
  ctx.value!.save();
  ctx.value!.lineWidth = 2;
  type === ChartType.DASHED_LINE && ctx.value!.setLineDash([5, 11]);
  // ctx.value!.globalAlpha = setIndex.value === setI ? 1 : 0.2;
  ctx.value!.beginPath();

  let activeX = 0;
  let activeY = 0;

  list.forEach((value, i) => {
    const isLast = i === list.length - 1;
    const isFirst = !i;

    const { x, y } = getLinePoint({
      value,
      isAlternative,
      data: list,
      normalizedW,
      h,
      index: i,
    });

    if (isFirst && typeof previous === "number") {
      const { x: firstX, y: firstY } = getLinePoint({
        value: previous || 0,
        data: list,
        normalizedW,
        h,
        index: i - 1,
      });

      ctx.value!.moveTo(firstX, firstY);
    }

    ctx.value!.lineTo(x, y);

    if (isLast && typeof next === "number") {
      const { x, y } = getLinePoint({
        value: next,
        data: list,
        normalizedW,
        h,
        index: i + 1,
      });

      ctx.value!.lineTo(x, y);
    }

    if (i === index.value) {
      activeX = x;
      activeY = y;
    }
  });

  ctx.value!.lineJoin = "round";
  ctx.value!.strokeStyle = color;
  ctx.value!.stroke();
  ctx.value!.closePath();

  if (showTooltip.value) {
    ctx.value!.setLineDash([]);
    ctx.value!.beginPath();
    ctx.value!.fillStyle = useCssRgbVar("--body");
    ctx.value!.arc(activeX, activeY, 3, 0, 2 * Math.PI);
    ctx.value!.fill();
    ctx.value!.stroke();
  }
  ctx.value!.restore();
};

watch([index, data, showTooltip], () => {
  draw();
});

const init = (): void => {
  draw();
};

// watch(themeColor, () => {
//   alt4 = useCssRgbVar("--alt4");
//   init();
// });

onMounted(() => {
  init();
});
</script>
<style lang="scss">
.ct-chart {
  .label-list {
    @apply flex flex-col justify-between pb-2 text-xs font-semibold leading-none;
  }
}
</style>
