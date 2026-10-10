<!--
  One-colour line mark: a main peak, a lower shoulder, and a snowline across
  the summit. It strokes with currentColor so it takes whatever text colour the
  caller sets and follows dark mode, unlike the multicolour emoji it replaced,
  which blurred into a grey blob at header size.

  public/favicon.svg draws the same paths; keep the two in step.
-->
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M3 26 L12 9 L17.5 18.5 L21 13 L29 26 Z" />
    <path d="M8.3 17 L10.6 18.8 L12.6 16.6 L14.8 18.4" />
  </svg>
</template>
