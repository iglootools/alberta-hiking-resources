<!--
  Layered ridgeline behind the landing hero. It is drawn rather than
  photographed so it needs no licence clearance and follows the theme: each
  ridge takes a semantic colour (secondary far, neutral middle, primary near)
  at low opacity, so it reads in light and dark mode without its own palette.

  `slice` crops the sides on narrow screens instead of squashing the peaks, and
  the bottom fade lets the hero hand over to the next section without a seam,
  whatever background that section sets.
-->
<template>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 sm:h-72 lg:h-80"
    style="mask-image: linear-gradient(to bottom, #000 55%, transparent)"
  >
    <svg
      viewBox="0 0 1440 320"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      class="size-full"
    >
      <path
        class="text-secondary"
        fill="currentColor"
        fill-opacity="0.18"
        d="M0 230 L90 170 L150 195 L240 120 L300 160 L360 135 L450 60 L520 130 L580 110 L660 150 L740 80 L800 120 L880 95 L960 140 L1040 70 L1110 125 L1180 100 L1260 150 L1340 110 L1440 160 V320 H0Z"
      />
      <path
        class="text-highlighted"
        fill="currentColor"
        fill-opacity="0.07"
        d="M0 260 L120 210 L200 235 L310 180 L390 225 L470 195 L560 240 L650 190 L720 215 L820 170 L900 220 L990 200 L1080 245 L1170 190 L1250 220 L1340 185 L1440 230 V320 H0Z"
      />
      <path
        class="text-primary"
        fill="currentColor"
        fill-opacity="0.16"
        d="M0 290 Q180 250 360 280 T720 275 T1080 285 T1440 270 V320 H0Z"
      />
    </svg>
  </div>
</template>
