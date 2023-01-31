<template>
  <main class="bg-gray-200 p-8">
    <div
      class="bg-gray-50 p-8 flex justify-center items-center rounded-xl shadow-xl w-full max-w-5xl"
    >
      <CTChart class="w-full h-[400px]" v-bind="args" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { CTChart } from "./components/chart";
import type { ChartProps } from "./components/chart/Chart.vue";
import { ChartType } from "./components/chart/constants";

const args: ChartProps = {
  alternativeLabelPrefix: "€",
  gridLines: {
    x: false,
    y: 4,
  },
  labels: {
    x: true,
    y: true,
  },
  data: {
    labels: [
      "02 Nov 2022",
      "03 Nov 2022",
      "04 Nov 2022",
      "05 Nov 2022",
      "06 Nov 2022",
      "07 Nov 2022",
      "08 Nov 2022",
      "09 Nov 2022",
      "10 Nov 2022",
      "11 Nov 2022",
      "12 Nov 2022",
      "13 Nov 2022",
      "14 Nov 2022",
      "15 Nov 2022",
      "16 Nov 2022",
      "17 Nov 2022",
      "18 Nov 2022",
      "19 Nov 2022",
      "20 Nov 2022",
      "21 Nov 2022",
      "22 Nov 2022",
      "23 Nov 2022",
      "24 Nov 2022",
      "25 Nov 2022",
      "26 Nov 2022",
      "27 Nov 2022",
      "28 Nov 2022",
      "29 Nov 2022",
      "30 Nov 2022",
      "01 Dec 2022",
      "02 Dec 2022",
    ],
    datasets: [
      {
        name: "Revenue",
        type: ChartType.BAR,
        isAlternative: false,
        color: "rgb(41,134,255)",
        data: [
          199, 274, 400, 345, 0, 5, 180, 281, 106, 158, 227, 0, 0, 71, 70, 68,
          69, 281, 0, 0, 148, 260, 106, 158, 227, 0, 0, 0, 106, 158, 227, 0, 0,
        ].map((x) => x * 500),
      },
    ],
  },
  toolTipBackgroundColor: "rgb(255, 255, 255)",
  textColor: "rgb( 0, 0, 0)",
};
</script>
